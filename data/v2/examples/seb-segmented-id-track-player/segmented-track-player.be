# Project-level timeline Player for firmware 0.12.11.
# Segment: [NetworkStorage file, timeline start ms, duration ms].
# Checkpoint: [exact seek time, scene file, next segment, next source cursor].
def TimelinePlayer(S)
    var segments = S.find("segments", [])
    var checkpoints = S.find("checkpoints", [])
    var debug = S.find("debug", false)
    var R = {
        "segment": 0,
        "cursor": 0,
        "bytes": nil,
        "at": nil,
        "last_time": 0,
        "last_epoch": 0,
        "last_paused": true,
        "ready": false
    }

    def reset_segment(segment_index, cursor)
        R["segment"] = segment_index
        R["cursor"] = cursor
        R["bytes"] = nil
        R["at"] = nil
    end

    def open_segment()
        if R["segment"] < 0 || R["segment"] >= segments.size()
            return false
        end

        var segment = segments[R["segment"]]
        var bytes_value = spectoda.getNetworkStorageData(segment[0])
        var at = timeline.toMillis(segment[1])
        if bytes_value == nil || at == nil
            if debug
                print("TimelinePlayer cannot open", segment[0])
            end
            return false
        end

        R["bytes"] = bytes_value
        R["at"] = at
        return true
    end

    def process_forward(target)
        while R["segment"] < segments.size()
            var segment = segments[R["segment"]]
            if target < segment[1]
                return true
            end
            if R["bytes"] == nil && !open_segment()
                return false
            end

            var until = target - segment[1]
            if until > segment[2]
                until = segment[2]
            end

            var result = SEB.land(R["bytes"], {
                "at": R["at"],
                "cursor": R["cursor"],
                "until": until
            })
            if !result["ok"]
                if debug
                    print("TimelinePlayer SEB error", result["error"])
                end
                return false
            end
            R["cursor"] = result["cursor"]

            if !result["done"]
                return true
            end
            reset_segment(R["segment"] + 1, 0)
        end
        return true
    end

    def reconcile(target)
        var index = 0
        while index < checkpoints.size()
            var checkpoint = checkpoints[index]
            if checkpoint[0] == target
                var bytes_value = spectoda.getNetworkStorageData(checkpoint[1])
                var at = timeline.toMillis(target)
                if bytes_value == nil || at == nil
                    return false
                end

                var result = SEB.land(bytes_value, {"at": at})
                if !result["ok"] || !result["done"]
                    if debug
                        print("TimelinePlayer checkpoint error", result["error"])
                    end
                    return false
                end

                reset_segment(checkpoint[2], checkpoint[3])
                return true
            end
            index += 1
        end

        if debug
            print("TimelinePlayer missing checkpoint", target)
        end
        return false
    end

    return Plugin(def()
        var state = timeline.getState()
        var time = state["time"]
        var epoch = state["epoch"]

        if !R["ready"]
            if !reconcile(time)
                return
            end
            R["ready"] = true
        # A pause-to-play transition is forward continuation even when the
        # transport refreshes its epoch. A paused seek was reconciled already.
        elif R["last_paused"] && !state["paused"] && time >= R["last_time"]
            if !process_forward(time)
                return
            end
        elif epoch != R["last_epoch"] || time < R["last_time"]
            if !reconcile(time)
                return
            end
        elif !state["paused"]
            if !process_forward(time)
                return
            end
        end

        R["last_time"] = time
        R["last_epoch"] = epoch
        R["last_paused"] = state["paused"]
    end)
end

TimelinePlayer({
    "segments": [
        ["brigh-000.seb", 0, 500],
        ["brigh-001.seb", 500, 500]
    ],
    "checkpoints": [
        [0, "brigh-cp-000.seb", 0, 1],
        [500, "brigh-cp-500.seb", 1, 1]
    ],
    "debug": false
})
