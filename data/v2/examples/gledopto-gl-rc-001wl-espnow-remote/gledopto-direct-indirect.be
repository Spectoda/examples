import espnow

# Source example is intentionally minified: short locals and numeric literals
# keep Berry bytecode/RAM small. Treat these comments like annotations around
# compact bytecode: they carry the semantic names that would otherwise be
# constants such as BTN_ON or PAYLOAD_SIZE. Studio tnglPreprocessing removes
# comments before upload, so detailed comments do not cost Controller RAM.
def GledoptoRemote(S)
    if S == nil
        S = {}
    end

    # S config map:
    # direct/indirect = Spectoda IDs controlled by the remote zones. The script
    # keeps these two names readable because they are the public plugin config;
    # only internal locals below are aggressively shortened.
    var d = S.find("direct", 1)
    var i = S.find("indirect", 2)

    # EVS(label, id) is the Spectoda EventState setter for one label and ID.
    # td/bd/cd expand to toggleDirect/brighDirect/tempeDirect.
    # "brigh" is the real Spectoda brightness label, not a typo.
    var td = EVS("toggl", d)
    var bd = EVS("brigh", d)
    var cd = EVS("tempe", d)

    # ti/bi/ci expand to toggleIndirect/brighIndirect/tempeIndirect.
    # Keeping direct/indirect setters separate lets one remote control both
    # installation zones with different button mappings.
    var ti = EVS("toggl", i)
    var bi = EVS("brigh", i)
    var ci = EVS("tempe", i)

    # m = allowed remote MAC. mf = whether to reject packets from other MACs.
    # mf defaults to true when m is set, so GledoptoRemote({"mac": "..."})
    # automatically locks to one physical remote. dbg enables packet logging.
    # bs/ts are brighStep/tempeStep; short names save bytes in every branch.
    var m = S.find("mac", "")
    var mf = S.find("macFilter", m != "")
    var dbg = S.find("debug", false)
    var bs = S.find("brighStep", 10)
    var ts = S.find("tempeStep", 10)

    # od/oi cache direct/indirect ON state for local toggle buttons.
    # b caches the shared brigh value. t/u cache direct/indirect tempe.
    # ls stores the last remote sequence so duplicate packets are ignored.
    # These caches are intentionally local; external changes can still happen.
    var od = 100
    var oi = 100
    var b = S.find("brigh", 50)
    var t = 0
    var u = 0
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
            print("GLEDOPTO", a, "btn", k, "rssi", r, "ch", ch, x.tohex())
        end

        # 1 = ON: direct + indirect ON. 100 means 100%.
        # 30 = PERCENTAGE value type in Spectoda value_t.
        if k == 1
            od = 100
            oi = 100
            td.set(100, 30)
            ti.set(100, 30)

        # 2 = OFF: direct + indirect OFF. 0 means 0%.
        elif k == 2
            od = 0
            oi = 0
            td.set(0, 30)
            ti.set(0, 30)

        # 9 = brightness plus for both zones. bs comes from S.brighStep and is
        # clamped to 0..100 before emitting brigh. toggl follows the resulting
        # shared brigh: b > 0 means both ON, b == 0 means both OFF.
        elif k == 9
            b = z(b + bs, 0, 100)
            bd.set(b, 30)
            bi.set(b, 30)
            od = b > 0 ? 100 : 0
            oi = od
            td.set(od, 30)
            ti.set(oi, 30)

        # 8 = brightness minus for both zones. When shared brigh reaches 0%,
        # both toggl states are also set to 0%.
        elif k == 8
            b = z(b - bs, 0, 100)
            bd.set(b, 30)
            bi.set(b, 30)
            od = b > 0 ? 100 : 0
            oi = od
            td.set(od, 30)
            ti.set(oi, 30)

        # 3 = night: direct OFF, indirect ON, both tempe warm. The old script
        # used this as a warm indirect night scene, so we preserve it.
        elif k == 3
            od = 0
            oi = 100
            td.set(0, 30)
            ti.set(100, 30)
            t = 100
            u = 100
            cd.set(100, 30)
            ci.set(100, 30)

        # 16 = preset 1: toggle indirect zone using cached oi.
        elif k == 16
            oi = oi > 0 ? 0 : 100
            ti.set(oi, 30)

        # 17 = preset 2: toggle direct zone using cached od.
        elif k == 17
            od = od > 0 ? 0 : 100
            td.set(od, 30)

        # 18 = preset 3: warmer. tempe is kept in -100..100 percentage space.
        elif k == 18
            t = z(t + ts, -100, 100)
            u = z(u + ts, -100, 100)
            cd.set(t, 30)
            ci.set(u, 30)

        # 19 = preset 4: colder. Direct and indirect tempe move together.
        elif k == 19
            t = z(t - ts, -100, 100)
            u = z(u - ts, -100, 100)
            cd.set(t, 30)
            ci.set(u, 30)

        elif dbg
            print("GLEDOPTO unknown", k, x.tohex())
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
