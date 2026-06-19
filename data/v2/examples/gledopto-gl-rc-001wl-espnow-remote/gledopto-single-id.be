import espnow

# Source example is intentionally minified: short locals and numeric literals
# keep Berry bytecode/RAM small. Treat these comments like annotations around
# compact bytecode: they carry the semantic names that would otherwise be
# constants such as BTN_ON or PAYLOAD_SIZE. Studio tnglPreprocessing removes
# comments before upload, so detailed comments do not cost Controller RAM.
def GledoptoRemoteSingle(S)
    if S == nil
        S = {}
    end

    # S config map:
    # id = Spectoda ID controlled by this remote. The plugin writes only two
    # EventStates for that ID: "toggl" for on/off and "brigh" for brightness.
    var id = S.find("id", 1)

    # tg/bg expand to toggle/brigh setters. "brigh" is the real Spectoda
    # brightness label, not a typo. 30 below means PERCENTAGE value type.
    var tg = EVS("toggl", id)
    var bg = EVS("brigh", id)

    # m = allowed remote MAC. mf = whether to reject packets from other MACs.
    # mf defaults to true when m is set, so GledoptoRemoteSingle({"mac": "..."})
    # automatically locks to one physical remote. dbg enables packet logging and
    # Studio-visible MAC chunks through LABEL EventStates mac1/mac2/mac3.
    # bs is brighStep; the short name saves bytes in both brightness branches.
    var m = S.find("mac", "")
    var mf = S.find("macFilter", m != "")
    var dbg = S.find("debug", false)
    var bs = S.find("brighStep", 10)

    # o caches ON state for local toggle buttons. b caches the current brigh.
    # ls stores the last remote sequence so duplicate channel sends are ignored.
    # These caches are intentionally local; external App changes can still
    # happen, and the next remote action will emit the new local value.
    var o = 100
    var b = S.find("brigh", 50)
    var ls = -1

    # z is clamp(v, lo, hi). It is short because it is called on every step.
    def z(v, lo, hi)
        if v < lo
            return lo
        elif v > hi
            return hi
        end
        return v
    end

    # rx args: a = sender MAC, x = payload bytes, r = RSSI, ch = Wi-Fi channel.
    # The native ESP-NOW layer already applied filter f below before Berry runs.
    def rx(a, x, r, ch)
        # 13 = GLEDOPTO GL-RC-001WL payload size. This would be PAYLOAD_SIZE in
        # a less compact script; keeping it literal avoids one more Berry name.
        if x.size() != 13
            return
        end

        # Byte 0 is program/magic. 129/145 are 0x81/0x91, the two observed
        # GLEDOPTO program prefixes. Other ESP-NOW traffic exits early here.
        var p = x.get(0)
        if p != 129 && p != 145
            return
        end

        # Bytes 1..4 are the sequence used to dedupe repeated channel sends.
        # The remote broadcasts the same button press on multiple Wi-Fi
        # channels, so only the first packet with a new sequence should act.
        var s = x.get(1, 4)
        if s == ls
            return
        end
        ls = s

        # Byte 6 is the button code. The branches below are the compact form of
        # named constants such as BTN_ON, BTN_BRIGHT_PLUS, BTN_PRESET_1, etc.
        var k = x.get(6)

        if dbg
            # LABEL values are label_t-sized. Split AA:BB:CC:DD:EE:FF into
            # mac1=AABB, mac2=CCDD, mac3=EEFF without importing string helpers.
            EVS.emit("mac1", a[0..1] + a[3..4], id, 31)
            EVS.emit("mac2", a[6..7] + a[9..10], id, 31)
            EVS.emit("mac3", a[12..13] + a[15..16], id, 31)
            print("GLEDOPTO single", a, "btn", k, "rssi", r, "ch", ch, x.tohex())
        end

        # 1 = ON: target ID ON. 100 means 100%; 30 means PERCENTAGE.
        if k == 1
            o = 100
            tg.set(100, 30)

        # 2 = OFF: target ID OFF. 0 means 0%.
        elif k == 2
            o = 0
            tg.set(0, 30)

        # 9 = brightness plus. bs comes from S.brighStep and is clamped to
        # 0..100 before emitting brigh. toggl follows the resulting brigh:
        # b > 0 means ON, b == 0 means OFF.
        elif k == 9
            b = z(b + bs, 0, 100)
            bg.set(b, 30)
            o = b > 0 ? 100 : 0
            tg.set(o, 30)

        # 8 = brightness minus. When the dimming reaches 0%, toggl is also set
        # to 0% so the App does not show "on with zero brightness".
        elif k == 8
            b = z(b - bs, 0, 100)
            bg.set(b, 30)
            o = b > 0 ? 100 : 0
            tg.set(o, 30)

        # 16 = preset 1: toggle the same single target ID.
        elif k == 16
            o = o > 0 ? 0 : 100
            tg.set(o, 30)

        # 17 = preset 2: also toggle the same single target ID. In the
        # direct/indirect variant this button toggles the direct zone; in the
        # single-ID variant it is intentionally equivalent to preset 1.
        elif k == 17
            o = o > 0 ? 0 : 100
            tg.set(o, 30)

        elif dbg
            # 3/18/19 are night/warmer/colder in the direct/indirect example.
            # This single-ID plugin intentionally ignores them because it owns
            # only toggle and brightness.
            print("GLEDOPTO single ignored", k, x.tohex())
        end
    end

    # Native ESP-NOW filter runs in C++ before Berry. It reduces Berry work by
    # allowing only payload size 13 and first byte 0x81/0x91, optionally locked
    # to one remote MAC. Future filter APIs can add more fields without
    # changing the rx callback shape.
    var f = {
        "size": 13,
        "magic": [129, 145]
    }
    if mf
        f = {
            "mac": m,
            "size": 13,
            "magic": [129, 145]
        }
    end
    # espnow.rx returns an unsubscribe handle h(); the native registry keeps the
    # callback alive. Store/call h() only when the script needs to unregister
    # before the plugin is removed.
    var h = espnow.rx(f, rx)

    return Plugin(def()
        # All work is done by rx().
    end)
end
