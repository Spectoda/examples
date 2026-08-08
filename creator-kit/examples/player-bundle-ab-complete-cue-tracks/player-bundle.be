# Project Berry Player for firmware 0.12.11 and SPM/SPT v1.
#
# Public API:
#   PlayerBundle({"namespace": "demo", "ids": [1], "debug": false})
#
# ID255 is discovered automatically when it exists in a generation. Configure
# only Controller-local IDs 0..254. NetworkStorage remains a global union: this
# Controller validates and opens only the global Track and its configured local
# Tracks.
def PlayerBundle(S)
    import string

    var ns = S.find("namespace", "player")
    var ids = S.find("ids", [])
    var dbg = S.find("debug", false)
    var integrity_polls = S.find("integrityPolls", 25)
    var retry_polls = S.find("retryPolls", 100)

    # The namespace is also part of every NetworkStorage filename. Keeping the
    # validation here makes an invalid Project fail before registering Plugin.
    if type(ns) != "string" || size(ns) < 1 || size(ns) > 14
        raise "value_error", "Player namespace must contain 1-14 ASCII characters"
    end
    var allowed = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-"
    for i : 0..size(ns) - 1
        if string.find(allowed, ns[i]) < 0
            raise "value_error", "Player namespace contains an invalid character"
        end
    end
    var manifest_file = ns + ".spm"
    if type(ids) != "instance" || classname(ids) != "list" ||
       type(integrity_polls) != "int" || type(retry_polls) != "int" ||
       integrity_polls < 1 || retry_polls < 1
        raise "value_error", "Player ids/poll configuration is invalid"
    end

    # local_ids is sorted once so activation and playback stay deterministic.
    var local_ids = []
    for id : ids
        if type(id) != "int" || id < 0 || id > 254
            raise "value_error", "Player local IDs must be integers in 0..254"
        end
        var at = 0
        while at < local_ids.size() && local_ids[at] < id
            at += 1
        end
        if at < local_ids.size() && local_ids[at] == id
            raise "value_error", "Player local IDs must be unique"
        end
        local_ids.insert(at, id)
    end

    # Mutable state lives in one map because Berry closures capture scalar
    # upvalues by value. active is kept when a newer upload is incomplete.
    var R = {
        "active": nil,
        "armed": false,
        "storage_dirty": false,
        "reconcile": nil,
        "last_time": 0,
        "last_epoch": 0,
        "last_paused": true,
        "timeline_zero": nil,
        "poll": 0,
        "round": 0,
        "error": nil
    }

    def log_error(message)
        if message != R["error"]
            R["error"] = message
            if dbg
                print("PlayerBundle", message)
            end
        end
    end

    def track_name(slot, id)
        var digits = str(id)
        if id < 10
            digits = "00" + digits
        elif id < 100
            digits = "0" + digits
        end
        return ns + "." + slot + "." + digits + ".spt"
    end

    # getNetworkStorageData(name, offset, length) is bounded to 8192 bytes.
    # Every read in this player is a header, directory entry, or <=4092B SEB.
    def read_exact(name, offset, length)
        var b = spectoda.getNetworkStorageData(name, offset, length)
        if b == nil || b.size() != length
            return nil
        end
        return b
    end

    def exact_size(name, size)
        var tail = spectoda.getNetworkStorageData(name, size, 1)
        return tail != nil && tail.size() == 0
    end

    def bytes_zero(b, first, last)
        for i : first..last
            if b.get(i) != 0
                return false
            end
        end
        return true
    end

    def bytes_equal(a, ao, b, bo, count)
        for i : 0..count - 1
            if a.get(ao + i) != b.get(bo + i)
                return false
            end
        end
        return true
    end

    def fingerprint_hex(b, offset)
        var h = "0123456789abcdef"
        var result = ""
        for i : 0..31
            var v = b.get(offset + i)
            result += h[(v >> 4) & 15] + h[v & 15]
        end
        return result
    end

    def metadata()
        var result = {}
        var entries = spectoda.listNetworkStorageData()
        if entries == nil
            return nil
        end
        for entry : entries
            var name = entry.find("name", nil)
            var fingerprint = entry.find("fingerprint", nil)
            if name != nil && fingerprint != nil
                result[name] = fingerprint
            end
        end
        return result
    end

    def generation(header, descriptor_offset, slot, expected_table)
        var count = header.get(descriptor_offset + 6, 2)
        var duration = header.get(descriptor_offset + 8, 4)
        var table = header.get(descriptor_offset + 12, 2)
        var table_size = header.get(descriptor_offset + 14, 2)
        if duration < 0 || table != expected_table || table_size != count * 44
            return nil
        end
        return {
            "slot": slot,
            "duration": duration,
            "count": count,
            "table": table,
            "table_size": table_size,
            "tracks": {}
        }
    end

    # Parse both generation tables so gaps, overlap, duplicates, unsorted IDs,
    # reserved fields, and trailing bytes fail before any artifact is opened.
    def parse_manifest(meta)
        var name = manifest_file
        var fp = meta.find(name, nil)
        var h = read_exact(name, 0, 112)
        if fp == nil || h == nil || h.get(0) != 83 || h.get(1) != 80 || h.get(2) != 77
            return nil
        end
        var file_size = h.get(6, 2)
        var ps = h.get(8)
        var fs = h.get(9)
        if h.get(3) != 1 || h.get(4) != 16 || h.get(5) != 0 ||
           (ps != 0 && ps != 1) || (fs != 0 && fs != 1 && fs != 255) ||
           fs == ps || h.get(10) != 48 || h.get(11) != 44 ||
           !bytes_zero(h, 12, 15) || file_size < 112 || !exact_size(name, file_size)
            return nil
        end

        var preferred = generation(h, 16, ps == 0 ? "a" : "b", 112)
        if preferred == nil
            return nil
        end
        var expected = 112 + preferred["table_size"]
        var fallback = nil
        if fs == 255
            if !bytes_zero(h, 64, 111)
                return nil
            end
        else
            fallback = generation(h, 64, fs == 0 ? "a" : "b", expected)
            if fallback == nil
                return nil
            end
            expected += fallback["table_size"]
        end
        if expected != file_size
            return nil
        end

        var generations = [preferred]
        if fallback != nil
            generations.push(fallback)
        end
        for g : generations
            var previous_id = -1
            for i : 0..g["count"] - 1
                var entry = read_exact(name, g["table"] + i * 44, 44)
                if entry == nil
                    return nil
                end
                var id = entry.get(0)
                if id <= previous_id || entry.get(1) != 0 || entry.get(10, 2) != 0
                    return nil
                end
                previous_id = id
                g["tracks"][id] = {
                    "id": id,
                    "size": entry.get(2, 2),
                    "revision": entry[4..9],
                    "fingerprint": fingerprint_hex(entry, 12)
                }
            end
        end
        return {"fingerprint": fp, "preferred": preferred, "fallback": fallback}
    end

    def read_segment(track, index)
        if index < 0 || index >= track["segment_count"]
            return nil
        end
        var b = read_exact(track["name"], track["segment_offset"] + index * 12, 12)
        if b == nil
            return nil
        end
        return {
            "origin": b.get(0, 4),
            "first_cue": b.get(4, 2),
            "cue_count": b.get(6, 2),
            "seb_offset": b.get(8, 2),
            "seb_size": b.get(10, 2)
        }
    end

    def read_cue(track, index)
        if index < 0 || index >= track["cue_count"]
            return nil
        end
        var b = read_exact(track["name"], track["cue_offset"] + index * 12, 12)
        if b == nil
            return nil
        end
        return {
            "time": b.get(0, 4),
            "segment": b.get(4, 2),
            "cursor": b.get(6, 2),
            "count": b.get(8, 2),
            "offset": b.get(10, 2)
        }
    end

    # Validate the full SPT directory and each embedded SEB without retaining
    # a whole SPT in Berry RAM. SEB.land at cursor=record_count is a native,
    # mutation-free full-blob validation call.
    def validate_track(descriptor, slot, duration, meta)
        var name = track_name(slot, descriptor["id"])
        if descriptor["size"] < 36 || descriptor["size"] > 65535 ||
           meta.find(name, nil) != descriptor["fingerprint"] ||
           !exact_size(name, descriptor["size"])
            return nil
        end
        var h = read_exact(name, 0, 36)
        if h == nil || h.get(0) != 83 || h.get(1) != 80 || h.get(2) != 84 ||
           h.get(3) != 1 || h.get(4) != 36 || h.get(5) != 0 ||
           h.get(6) != descriptor["id"] || h.get(7) != 0 ||
           !bytes_equal(h, 8, descriptor["revision"], 0, 6) ||
           h.get(14) != 12 || h.get(15) != 12 || h.get(16, 4) != duration ||
           h.get(20, 2) < 1 || h.get(20, 2) > 340 || h.get(22, 2) < 1 ||
           h.get(24, 2) < 1 || h.get(26, 2) != 36 || h.get(34, 2) != 0 ||
           h.get(32, 2) != descriptor["size"]
            return nil
        end
        var cue_count = h.get(22, 2)
        var segment_count = h.get(24, 2)
        var segment_offset = h.get(28, 2)
        var data_offset = h.get(30, 2)
        if segment_offset != 36 + cue_count * 12 ||
           data_offset != segment_offset + segment_count * 12 ||
           data_offset > descriptor["size"]
            return nil
        end

        var track = {
            "id": descriptor["id"],
            "name": name,
            "fingerprint": descriptor["fingerprint"],
            "size": descriptor["size"],
            "duration": duration,
            "event_count": h.get(20, 2),
            "cue_count": cue_count,
            "segment_count": segment_count,
            "cue_offset": 36,
            "segment_offset": segment_offset,
            "data_offset": data_offset,
            "play_segment": 0,
            "cursor": 0,
            "bytes": nil,
            "at": nil
        }

        var expected_cue = 0
        var expected_data = data_offset
        var previous_time = -1
        for segment_index : 0..segment_count - 1
            var segment = read_segment(track, segment_index)
            if segment == nil || segment["origin"] < 0 ||
               segment["first_cue"] != expected_cue || segment["cue_count"] < 1 ||
               segment["first_cue"] + segment["cue_count"] > cue_count ||
               segment["seb_offset"] != expected_data || segment["seb_size"] < 12 ||
               segment["seb_size"] > 4092 ||
               segment["seb_offset"] + segment["seb_size"] > descriptor["size"]
                return nil
            end
            var seb = read_exact(name, segment["seb_offset"], segment["seb_size"])
            if seb == nil || seb.get(0) != 83 || seb.get(1) != 69 || seb.get(2) != 66 ||
               seb.get(3) != 1 || seb.get(4) != 12 || seb.get(5) != 0 ||
               seb.get(10) != 12 || seb.get(11) != 0
                return nil
            end
            var records = seb.get(6, 2)
            var seb_duration = seb.get(8, 2)
            if records < 1 || records > 340 || segment["seb_size"] != 12 + records * 12 ||
               records != segment["cue_count"] * track["event_count"]
                return nil
            end
            var inspected = SEB.land(seb, {
                "at": controller.millis(),
                "cursor": records,
                "until": 0
            })
            if !inspected["ok"] || !inspected["done"] || inspected["cursor"] != records ||
               inspected["consumed"] != 0
                return nil
            end

            var expected_record = 0
            for local_cue : 0..segment["cue_count"] - 1
                var cue_index = segment["first_cue"] + local_cue
                var cue = read_cue(track, cue_index)
                if cue == nil || cue["time"] <= previous_time || cue["time"] > duration ||
                   cue["segment"] != segment_index || cue["cursor"] != expected_record ||
                   cue["count"] != track["event_count"] ||
                   cue["offset"] != cue["time"] - segment["origin"] ||
                   cue["offset"] > seb_duration ||
                   (local_cue == 0 && cue["time"] != segment["origin"])
                    return nil
                end
                if cue_index == 0 && cue["time"] != 0
                    return nil
                end
                for record : 0..cue["count"] - 1
                    var record_offset = 12 + (cue["cursor"] + record) * 12
                    if seb.get(record_offset + 8, 2) != cue["offset"] ||
                       seb.get(record_offset + 10) != track["id"]
                        return nil
                    end
                end
                expected_record += cue["count"]
                previous_time = cue["time"]
            end
            if expected_record != records
                return nil
            end
            expected_cue += segment["cue_count"]
            expected_data += segment["seb_size"]
        end
        if expected_cue != cue_count || expected_data != descriptor["size"]
            return nil
        end
        return track
    end

    def validate_generation(manifest, generation, meta)
        if generation == nil
            return nil
        end
        var requested = []
        if generation["tracks"].contains(255)
            requested.push(255)
        end
        for id : local_ids
            if !generation["tracks"].contains(id)
                return nil
            end
            requested.push(id)
        end

        var tracks = []
        for id : requested
            var track = validate_track(
                generation["tracks"][id], generation["slot"], generation["duration"], meta)
            if track == nil
                return nil
            end
            tracks.push(track)
        end
        return {
            "slot": generation["slot"],
            "duration": generation["duration"],
            "manifest_fingerprint": manifest["fingerprint"],
            "tracks": tracks
        }
    end

    def active_matches(active, meta)
        if meta == nil
            return nil
        end
        if active == nil ||
           meta.find(manifest_file, nil) != active["manifest_fingerprint"]
            return false
        end
        for track : active["tracks"]
            if meta.find(track["name"], nil) != track["fingerprint"]
                return false
            end
        end
        return true
    end

    # Preferred is tried first. A failed preferred never replaces the current
    # generation; a fully valid fallback is the only startup/recovery choice.
    def load_bundle()
        var before = metadata()
        if before == nil
            return nil
        end
        var manifest = parse_manifest(before)
        if manifest == nil
            return nil
        end
        var candidate = validate_generation(manifest, manifest["preferred"], before)
        if candidate == nil
            candidate = validate_generation(manifest, manifest["fallback"], before)
        end
        if candidate == nil
            return nil
        end
        var after = metadata()
        if !active_matches(candidate, after)
            return nil
        end
        return candidate
    end

    def subtract_local_millis(local_millis, offset)
        # Avoid relying on signed-overflow behavior at the 32-bit millis wrap.
        var minimum = -2147483648
        if local_millis >= minimum + offset
            return local_millis - offset
        end
        var underflow = offset - (local_millis - minimum)
        return 2147483647 - underflow + 1
    end

    def add_local_millis(local_millis, offset)
        # Mirror subtract_local_millis while keeping the result in signed
        # 32-bit millis space across controller.millis() wrap.
        var maximum = 2147483647
        var room = maximum - local_millis
        if offset <= room
            return local_millis + offset
        end
        return -2147483648 + (offset - room - 1)
    end

    def find_cue(track, target)
        var low = 0
        var high = track["cue_count"] - 1
        var found = nil
        while low <= high
            var middle = (low + high) >> 1
            var cue = read_cue(track, middle)
            if cue == nil
                return nil
            end
            if cue["time"] <= target
                found = cue
                low = middle + 1
            else
                high = middle - 1
            end
        end
        return found
    end

    def prepare_seek(track, target, local_now)
        var cue = find_cue(track, target)
        if cue == nil
            return nil
        end
        var segment = read_segment(track, cue["segment"])
        if segment == nil
            return nil
        end
        return {
            "track": track,
            "cue": cue,
            "segment": segment,
            "at": subtract_local_millis(local_now, cue["offset"])
        }
    end

    def begin_reconcile(state)
        var active = R["active"]
        if active == nil || state["time"] < 0 || state["time"] > active["duration"]
            R["armed"] = false
            R["reconcile"] = nil
            log_error("timeline is outside the active show")
            return false
        end
        # Keep the discontinuity trigger armed until reconciliation completes,
        # so a transient projection/directory read failure retries next turn.
        R["last_epoch"] = state["epoch"] - 1
        var local_now = timeline.at(state["time"])
        if local_now == nil
            R["armed"] = false
            log_error("timeline cannot project local millis")
            return false
        end
        R["timeline_zero"] = subtract_local_millis(local_now, state["time"])
        # Freeze one mapping per timeline epoch/discontinuity. Calling
        # timeline.at(segment origin) separately for each Track can
        # quantize equal Cues one millisecond apart on real Controllers.
        # Resolve every Cue and segment directory before the first Cue value is
        # landed. SEB bytes are loaded one Track at a time so a large
        # multi-ID bundle does not remain resident in Berry RAM.
        var operations = []
        for track : active["tracks"]
            var operation = prepare_seek(track, state["time"], local_now)
            if operation == nil
                R["armed"] = false
                log_error("failed to prepare Cue")
                return false
            end
            operations.push(operation)
        end
        R["armed"] = false
        R["reconcile"] = {
            "target": state["time"],
            "epoch": state["epoch"],
            "operations": operations,
            "index": 0
        }
        return true
    end

    def reconcile_step(state)
        var reconciliation = R["reconcile"]
        if reconciliation == nil
            return false
        end
        if state["epoch"] != reconciliation["epoch"]
            R["reconcile"] = nil
            return begin_reconcile(state)
        end
        if reconciliation["index"] < reconciliation["operations"].size()
            var operation = reconciliation["operations"][reconciliation["index"]]
            var matches = active_matches(R["active"], metadata())
            if matches == nil
                return false
            end
            if !matches
                R["storage_dirty"] = true
                R["reconcile"] = nil
                log_error("Player artifacts changed")
                return false
            end
            var cue = operation["cue"]
            var segment = operation["segment"]
            var seb = read_exact(operation["track"]["name"],
                                 segment["seb_offset"], segment["seb_size"])
            if seb == nil
                log_error("failed to range-read Cue SEB")
                return false
            end
            var result = SEB.land(seb, {
                "at": operation["at"],
                "cursor": cue["cursor"],
                "until": cue["offset"]
            })
            if !result["ok"] || result["consumed"] != cue["count"]
                log_error("Complete Cue failed: " + str(result["error"]))
                return false
            end
            var track = operation["track"]
            var next_cursor = result["cursor"]
            if result["done"]
                track["play_segment"] = cue["segment"] + 1
                track["cursor"] = 0
            else
                track["play_segment"] = cue["segment"]
                track["cursor"] = next_cursor
            end
            track["bytes"] = nil
            track["at"] = nil
            reconciliation["index"] += 1
            return true
        end

        R["reconcile"] = nil
        R["armed"] = true
        R["last_time"] = state["time"]
        R["last_epoch"] = state["epoch"]
        R["last_paused"] = state["paused"]
        R["error"] = nil
        return true
    end

    # Return 1 after one SEB call, 0 when this Track has nothing due, and -1 on
    # a read/projection failure. Cursor advances only from a successful native call.
    def process_track(track, target)
        if track["play_segment"] >= track["segment_count"]
            return 0
        end
        var segment = read_segment(track, track["play_segment"])
        if segment == nil || target < segment["origin"]
            return segment == nil ? -1 : 0
        end
        if track["bytes"] == nil
            track["bytes"] = read_exact(track["name"], segment["seb_offset"], segment["seb_size"])
            if R["timeline_zero"] != nil
                track["at"] = add_local_millis(R["timeline_zero"], segment["origin"])
            end
            if track["bytes"] == nil || track["at"] == nil
                track["bytes"] = nil
                track["at"] = nil
                return -1
            end
        end
        var until = target - segment["origin"]
        var duration = track["bytes"].get(8, 2)
        if until > duration
            until = duration
        end
        var result = SEB.land(track["bytes"], {
            "at": track["at"],
            "cursor": track["cursor"],
            "until": until
        })
        if !result["ok"]
            log_error("forward SEB failed: " + str(result["error"]))
            return 1
        end
        track["cursor"] = result["cursor"]
        if result["done"]
            track["play_segment"] += 1
            track["cursor"] = 0
            track["bytes"] = nil
            track["at"] = nil
        end
        R["error"] = nil
        return 1
    end

    # At most one SEB call is issued per Plugin turn. This makes the native
    # 340-value atomic queue available to one complete Cue even with many IDs.
    def process_forward(target)
        var tracks = R["active"]["tracks"]
        if tracks.size() == 0
            return
        end
        for checked : 0..tracks.size() - 1
            var index = (R["round"] + checked) % tracks.size()
            var status = process_track(tracks[index], target)
            if status != 0
                R["round"] = (index + 1) % tracks.size()
                if status < 0
                    log_error("failed to range-read active SPT")
                end
                return
            end
        end
    end

    return Plugin(def()
        var state = timeline.getState()
        R["poll"] += 1

        # Integrity polling watches only the manifest and currently active
        # relevant SPTs. Writes to the inactive slot do not interrupt playback;
        # the SPM-last publication is the change that arms reconciliation.
        if R["active"] != nil && R["poll"] % integrity_polls == 0
            if active_matches(R["active"], metadata()) == false
                R["storage_dirty"] = true
                R["armed"] = false
                R["reconcile"] = nil
                log_error("Player artifacts changed; pause")
            end
        end

        if R["storage_dirty"]
            if state["paused"] && R["poll"] % retry_polls == 0
                var candidate = load_bundle()
                if candidate != nil
                    R["active"] = candidate
                    R["storage_dirty"] = false
                    begin_reconcile(state)
                else
                    log_error("Player generation incomplete")
                end
            end
            return
        end

        if R["active"] == nil
            if R["poll"] == 1 || R["poll"] % retry_polls == 0
                var candidate = load_bundle()
                if candidate != nil
                    R["active"] = candidate
                    begin_reconcile(state)
                else
                    log_error("no complete Player generation")
                end
            end
            return
        end

        if R["reconcile"] != nil
            reconcile_step(state)
            return
        end

        # A paused timeline stops advancing while the local/network clock does
        # not. Refresh the mapping on resume without landing the current Cue
        # again: an external event remains authoritative until the next Cue,
        # whose causal clock must still reflect the time spent paused.
        if R["last_paused"] && !state["paused"]
            var local_now = timeline.at(state["time"])
            if local_now == nil
                log_error("timeline resume has no local projection")
                return
            end
            R["timeline_zero"] = subtract_local_millis(local_now, state["time"])
            for track : R["active"]["tracks"]
                track["bytes"] = nil
                track["at"] = nil
            end
        end

        # Rewind, seek, and timeline loop are all reconstructed from the last
        # complete Cue at/before the new shared timeline position.
        if state["epoch"] != R["last_epoch"] || state["time"] < R["last_time"]
            if begin_reconcile(state)
                reconcile_step(state)
            end
            return
        end

        if !state["paused"] && R["armed"]
            process_forward(state["time"])
        end
        R["last_time"] = state["time"]
        R["last_epoch"] = state["epoch"]
        R["last_paused"] = state["paused"]
    end)
end

# Copy this call into each Controller's Project and configure only its local IDs.
PlayerBundle({"namespace": "demo", "ids": [1], "debug": false})
