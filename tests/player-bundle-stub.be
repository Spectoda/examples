# Host-Berry lifecycle smoke for the public Project script. It reads the same
# two-generation corpus shipped with the example and supplies small firmware
# API stubs; no production Controller APIs are involved.
import json

class SpectodaStub
    var files, fingerprints, reads, list_failures

    def init(fixture)
        self.files = {}
        self.fingerprints = {}
        self.reads = []
        self.list_failures = 0
        for item : fixture["uploadOrder"]
            self.files[item["name"]] = bytes(item["hex"])
            self.fingerprints[item["name"]] = item["fingerprint"]
        end
    end

    def listNetworkStorageData()
        if self.list_failures > 0
            self.list_failures -= 1
            return nil
        end
        var result = []
        for name : self.files.keys()
            result.push({"name": name, "fingerprint": self.fingerprints[name]})
        end
        return result
    end

    def getNetworkStorageData(name, offset, length)
        self.reads.push([name, offset, length])
        var data = self.files.find(name, nil)
        if data == nil || offset < 0 || offset > data.size()
            return nil
        end
        if length == 0 || offset == data.size()
            return bytes()
        end
        return data[offset..offset + length - 1]
    end
end

class TimelineStub
    var state, local_now, anchor_failures

    def init()
        self.state = {"time": 0, "paused": true, "epoch": 1}
        self.local_now = 1000
        self.anchor_failures = 0
    end

    def getState()
        return self.state
    end

    def toMillis(timestamp)
        if self.anchor_failures > 0
            self.anchor_failures -= 1
            return nil
        end
        return self.local_now + timestamp - self.state["time"]
    end
end

class ControllerStub
    def millis()
        return 1000
    end
end

class SebStub
    var applied

    def init()
        self.applied = []
    end

    def land(data, args)
        var records = data.get(6, 2)
        var cursor = args.find("cursor", 0)
        var until = args.find("until", 0)
        var consumed = 0
        while cursor < records && data.get(12 + cursor * 12 + 8, 2) <= until
            var offset = 12 + cursor * 12
            self.applied.push({
                "value": data.get(offset, 4),
                "offset": data.get(offset + 8, 2),
                "id": data.get(offset + 10),
                "at": args["at"]
            })
            cursor += 1
            consumed += 1
        end
        return {
            "ok": true,
            "cursor": cursor,
            "consumed": consumed,
            "done": cursor == records,
            "error": nil
        }
    end
end

var fixture_file = open(
    "data/v2/examples/player-bundle-ab-snapshot-tracks/player-bundle-artifacts.json", "r")
var fixture = json.load(fixture_file.read())
fixture_file.close()
var final_manifest = nil
for item : fixture["uploadOrder"]
    if item["name"] == "demo.spm"
        final_manifest = item
    end
end
var stage_a_manifest = fixture["stages"][0]["manifest"]
assert(final_manifest != nil)

spectoda = SpectodaStub(fixture)
timeline = TimelineStub()
controller = ControllerStub()
SEB = SebStub()
stub_state = {"callback": nil}

def Plugin(callback)
    stub_state["callback"] = callback
    return callback
end

compile("data/v2/examples/player-bundle-ab-snapshot-tracks/player-bundle.be", "file")()
assert(stub_state["callback"] != nil)

# First turn validates preferred slot B and prepares the timeline-zero snapshot.
stub_state["callback"]()
# One complete Track snapshot per turn: global ID255, then configured ID1.
stub_state["callback"]()
stub_state["callback"]()
stub_state["callback"]()
assert(SEB.applied.size() == 2)
assert(SEB.applied[0]["id"] == 255)
assert(SEB.applied[1]["id"] == 1)
# Generation B ID1 starts at 20%; this is its raw portable value_t.
assert(SEB.applied[1]["value"] == bytes("0bd01213").get(0, 4))

# Resume and advance the shared timeline. Both 1000 ms Cues are eventually due,
# but still at most one SEB call is made in each callback turn.
# Eight seconds elapsed locally while the timeline stayed paused. The Player
# must refresh its mapping so the next Cue gets clock 9000, not the stale 2000.
timeline.local_now = 9000
timeline.state["paused"] = false
timeline.state["time"] = 1000
# A transient local-anchor failure retries on the next Plugin turn without
# disarming forward playback.
timeline.anchor_failures = 1
for i : 0..3
    stub_state["callback"]()
end
assert(SEB.applied.size() == 4)
assert(SEB.applied[2]["offset"] == 1000)
assert(SEB.applied[3]["offset"] == 1000)
assert(SEB.applied[2]["at"] == 8000)
assert(SEB.applied[3]["at"] == 8000)

# A transient metadata listing failure at the next integrity poll must not mark
# valid artifacts dirty or stop the next due Cue.
spectoda.list_failures = 1
for i : 0..16
    stub_state["callback"]()
end
timeline.state["time"] = 2000
for i : 0..3
    stub_state["callback"]()
end
assert(SEB.applied.size() == 6)
assert(SEB.applied[5]["offset"] == 2000)

# Publish slot A by changing SPM last. The player halts while dirty, waits for
# the paused retry boundary, then lands one complete t=2000 snapshot per Track.
timeline.state["paused"] = true
spectoda.files["demo.spm"] = bytes(stage_a_manifest["hex"])
spectoda.fingerprints["demo.spm"] = stage_a_manifest["fingerprint"]
for i : 0..69
    stub_state["callback"]()
end
assert(SEB.applied.size() == 6)
for i : 0..3
    stub_state["callback"]()
end
assert(SEB.applied.size() == 8)
# Generation A ID1 at t=2000 returns to 10%.
assert(SEB.applied[7]["value"] == bytes("0b688909").get(0, 4))

# A backward loop reconstructs the complete t=0 snapshot with one fresh anchor
# shared across both Track files.
timeline.local_now = 20000
timeline.state["time"] = 0
for i : 0..2
    stub_state["callback"]()
end
assert(SEB.applied.size() == 10)
assert(SEB.applied[8]["at"] == 20000)
assert(SEB.applied[9]["at"] == 20000)

# Restore the final two-generation manifest for the independent fallback test.
spectoda.files["demo.spm"] = bytes(final_manifest["hex"])
spectoda.fingerprints["demo.spm"] = final_manifest["fingerprint"]

# A missing preferred local artifact must select the complete slot-A fallback.
spectoda.files.remove("demo.b.001.spt")
spectoda.fingerprints.remove("demo.b.001.spt")
timeline = TimelineStub()
SEB = SebStub()
stub_state["callback"] = nil
compile("data/v2/examples/player-bundle-ab-snapshot-tracks/player-bundle.be", "file")()
stub_state["callback"]()
stub_state["callback"]()
stub_state["callback"]()
stub_state["callback"]()
assert(SEB.applied.size() == 2)
assert(SEB.applied[1]["id"] == 1)
# Generation A ID1 starts at 10%.
assert(SEB.applied[1]["value"] == bytes("0b688909").get(0, 4))

for read : spectoda.reads
    assert(read[2] <= 4092)
end

# Lock both sides of the sorted local-ID contract so valid unsorted IDs and real
# duplicates do not regress behind the single-ID physical fixture.
var player_file = open(
    "data/v2/examples/player-bundle-ab-snapshot-tracks/player-bundle.be", "r")
var player_source = player_file.read()
player_file.close()
var valid_multi_id = true
try
    compile(player_source +
        '\nPlayerBundle({"namespace":"demo","ids":[1,0],"debug":false})',
        "string")()
except ..
    valid_multi_id = false
end
assert(valid_multi_id)
var duplicate_rejected = false
try
    compile(player_source +
        '\nPlayerBundle({"namespace":"demo","ids":[5,5],"debug":false})',
        "string")()
except ..
    duplicate_rejected = true
end
assert(duplicate_rejected)
print("player-bundle preferred/fallback/range smoke: PASS")
