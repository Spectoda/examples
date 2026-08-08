# Host-Berry lifecycle smoke for the public static Player plugin. It uses the
# same synthetic player.show + SEB corpus shipped with the example and small
# firmware API stubs; no Controller or customer data is involved.
import json
import string

# Declare firmware globals before class/function compilation in host Berry.
spectoda = nil
timeline = nil
SEB = nil
stub_state = nil
Player = nil

class SpectodaStub
    var files, reads

    def init(fixture)
        self.files = {}
        self.reads = []
        for item : fixture["files"]
            self.files[item["name"]] = bytes(item["hex"])
        end
    end

    def getNetworkStorageData(name)
        self.reads.push(name)
        return self.files.find(name, nil)
    end
end

class TimelineStub
    var state, local_now, projection_failures

    def init()
        self.state = {"time": 0, "paused": true, "epoch": 1}
        self.local_now = 1000
        self.projection_failures = 0
    end

    def getState()
        return self.state
    end

    def at(position)
        if self.projection_failures > 0
            self.projection_failures -= 1
            return nil
        end
        return self.local_now + position - self.state["time"]
    end
end

class SebStub
    var applied, calls

    def init()
        self.applied = []
        self.calls = []
    end

    def land(name, args)
        var original_cursor = args.find("cursor", 0)
        self.calls.push({"name": name, "args": args})
        if args.find("source", nil) != "networkStorage"
            return {"ok": false, "cursor": original_cursor, "consumed": 0,
                    "done": false, "error": "source"}
        end
        var data = spectoda.files.find(name, nil)
        if data == nil || data.size() < 12 || data.get(0) != 83 ||
           data.get(1) != 69 || data.get(2) != 66
            return {"ok": false, "cursor": original_cursor, "consumed": 0,
                    "done": false, "error": "file"}
        end
        var records = data.get(6, 2)
        var cursor = original_cursor
        var until = args.find("until", 0)
        var consumed = 0
        while cursor < records && data.get(12 + cursor * 12 + 8, 2) <= until
            var p = 12 + cursor * 12
            self.applied.push({
                "value": data.get(p, 4),
                "offset": data.get(p + 8, 2),
                "id": data.get(p + 10),
                "at": args["at"]
            })
            cursor += 1
            consumed += 1
        end
        return {"ok": true, "cursor": cursor, "consumed": consumed,
                "done": cursor == records, "error": nil}
    end
end

var fixture_file = open(
    "data/v2/examples/player-show-complete-cue-tracks/player-show-artifacts.json", "r")
var fixture = json.load(fixture_file.read())
fixture_file.close()

spectoda = SpectodaStub(fixture)
timeline = TimelineStub()
SEB = SebStub()
stub_state = {"callback": nil}

def Plugin(callback)
    stub_state["callback"] = callback
    return callback
end

compile("data/v2/examples/player-show-complete-cue-tracks/player.be", "file")()
Player({"base": "demo", "ids": [1], "debug": false})
assert(stub_state["callback"] != nil)

# Initial paused reconciliation lands one complete Cue per relevant Track. ID1
# wins the time-zero tie; ID255 follows. ID2 is synchronized but never opened.
stub_state["callback"]()
stub_state["callback"]()
stub_state["callback"]()
assert(SEB.applied.size() == 3)
assert(SEB.applied[0]["id"] == 1)
assert(SEB.applied[1]["id"] == 1)
assert(SEB.applied[2]["id"] == 255)
assert(SEB.calls.size() == 2)
assert(SEB.calls[0]["name"] == "demo.001.000.seb")
assert(SEB.calls[1]["name"] == "demo.255.000.seb")

# Stable pause is silent. Resume derives a fresh projection and lands the
# t=5000 complete Cues, still at most one SEB contribution per turn.
for i : 0..2 stub_state["callback"]() end
assert(SEB.calls.size() == 2)
timeline.local_now = 9000
timeline.state["time"] = 5000
timeline.state["paused"] = false
timeline.projection_failures = 1
stub_state["callback"]()
assert(SEB.calls.size() == 2)
stub_state["callback"]()
stub_state["callback"]()
assert(SEB.applied.size() == 6)
assert(SEB.applied[3]["offset"] == 5000)
assert(SEB.applied[4]["offset"] == 5000)
assert(SEB.applied[5]["offset"] == 5000)
assert(SEB.applied[3]["at"] == 4000)
assert(SEB.applied[5]["at"] == 4000)

# Pause/resume at an already consumed position never relands it.
timeline.state["paused"] = true
stub_state["callback"]()
timeline.local_now = 12000
timeline.state["paused"] = false
stub_state["callback"]()
assert(SEB.applied.size() == 6)

# A backward seek/epoch reloads the Show Index. A missing relevant file retries
# without advancing or starting forward playback; restoring it succeeds.
timeline.state = {"time": 0, "paused": true, "epoch": 2}
timeline.local_now = 20000
var id1 = spectoda.files["demo.001.000.seb"]
spectoda.files.remove("demo.001.000.seb")
stub_state["callback"]()
stub_state["callback"]()
assert(SEB.applied.size() == 6)
spectoda.files["demo.001.000.seb"] = id1
stub_state["callback"]()
stub_state["callback"]()
stub_state["callback"]()
assert(SEB.applied.size() == 9)
assert(SEB.applied[6]["at"] == 20000)
assert(SEB.applied[8]["at"] == 20000)

# The shared 24-hour wrap is another discontinuity and reconciles time zero.
timeline.state = {"time": 0, "paused": true, "epoch": 3}
timeline.local_now = 86421000
stub_state["callback"]()
stub_state["callback"]()
stub_state["callback"]()
assert(SEB.applied.size() == 12)

# Exact EOF is fail-closed: a trailing Show Index byte performs no SEB call.
for item : fixture["files"]
    if item["name"] == "demo.show" item["hex"] += "00" end
end
spectoda = SpectodaStub(fixture)
timeline = TimelineStub()
SEB = SebStub()
stub_state["callback"] = nil
Player({"base": "demo", "ids": [1], "debug": false})
stub_state["callback"]()
assert(SEB.calls.size() == 0)

# A delayed player call clamps a segment contribution to the native uint16
# due window, then continues with the next deterministic segment on the next
# turn. This also locks the one-SEB-call-per-plugin-turn policy.
var catchup_fixture = {
    "files": [
        {
            "name": "catch.show",
            "hex": "5053480110000100a0860100000000000100010002000000"+
                   "0000000002000000000050c300000100010000000000"
        },
        {
            "name": "catch.001.000.seb",
            "hex": "534542010c000200ffff0c000b688909c891480200000100"+
                   "0b08af2fc891480250c30100"
        },
        {
            "name": "catch.001.001.seb",
            "hex": "534542010c00010000000c000b688909c891480200000100"
        }
    ]
}
spectoda = SpectodaStub(catchup_fixture)
timeline = TimelineStub()
SEB = SebStub()
stub_state["callback"] = nil
Player({"base": "catch", "ids": [1], "debug": false})
stub_state["callback"]()
stub_state["callback"]()
assert(SEB.applied.size() == 1)
timeline.local_now = 91000
timeline.state = {"time": 90000, "paused": false, "epoch": 1}
stub_state["callback"]()
assert(SEB.calls.size() == 2)
assert(SEB.calls[1]["args"]["until"] == 65535)
assert(SEB.applied[1]["offset"] == 50000)
stub_state["callback"]()
assert(SEB.calls.size() == 3)
assert(SEB.calls[2]["name"] == "catch.001.001.seb")
assert(SEB.calls[2]["args"]["until"] == 24464)
assert(SEB.applied[2]["offset"] == 0)

# A Cue reached while paused remains unconsumed and lands exactly after an
# ordinary resume at that same shared-timeline position.
spectoda = SpectodaStub(catchup_fixture)
timeline = TimelineStub()
SEB = SebStub()
stub_state["callback"] = nil
Player({"base": "catch", "ids": [1], "debug": false})
stub_state["callback"]()
stub_state["callback"]()
timeline.local_now = 51000
timeline.state = {"time": 50000, "paused": true, "epoch": 1}
stub_state["callback"]()
assert(SEB.calls.size() == 1)
timeline.state["paused"] = false
stub_state["callback"]()
assert(SEB.calls.size() == 2)
assert(SEB.calls[1]["args"]["until"] == 50000)
assert(SEB.applied.size() == 2)
assert(SEB.applied[1]["offset"] == 50000)

# Lock the public API and configuration shape.
var player_file = open(
    "data/v2/examples/player-show-complete-cue-tracks/player.be", "r")
var player_source = player_file.read()
player_file.close()
assert(size(player_source) <= 4093)
assert(string.find(player_source, "timeline.at") >= 0)
assert(string.find(player_source, "timeline.toMillis") < 0)
assert(string.find(player_source, '"source":"networkStorage"') >= 0)
var duplicate_rejected = false
try
    Player({"base": "demo", "ids": [5, 5]})
except ..
    duplicate_rejected = true
end
assert(duplicate_rejected)
var unsafe_base_rejected = false
try
    Player({"base": "bad.name", "ids": [1]})
except ..
    unsafe_base_rejected = true
end
assert(unsafe_base_rejected)
var non_ascii_base_rejected = false
try
    Player({"base": "přehrávač", "ids": [1]})
except ..
    non_ascii_base_rejected = true
end
assert(non_ascii_base_rejected)
print("player.show static complete-Cue lifecycle smoke: PASS")
