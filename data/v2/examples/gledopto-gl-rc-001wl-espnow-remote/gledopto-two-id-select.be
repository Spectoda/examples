import espnow

# Two-ID GLEDOPTO GL-RC-001WL variant for installations where S1/S2/S3/S4
# choose the active brightness target group. Source is compact but commented;
# Studio tnglPreprocessing removes comments before upload.
def GledoptoRemoteTwoIdSelect(S)
    if S == nil
        S = {}
    end

    # Public S config. id1/id2 default to the requested field setup.
    var i1 = S.find("id1", 1)
    var i2 = S.find("id2", 101)

    # b1/b2 and t1/t2 expand to brigh/toggl setters for id1/id2.
    # e1/e2 expand to D_ena disable setters. 30 = PERCENTAGE value type.
    var b1 = EVS("brigh", i1)
    var b2 = EVS("brigh", i2)
    var t1 = EVS("toggl", i1)
    var t2 = EVS("toggl", i2)
    var e1 = EVS("D_ena", i1)
    var e2 = EVS("D_ena", i2)

    # m = allowed remote MAC. mf defaults to true when m is a real value.
    # The placeholder MAC must not enable filtering during Studio discovery.
    # dbg keeps serial packet logging. bs is brightness step in percent.
    var m = S.find("mac", "")
    var mf = S.find("macFilter", m != "" && m != "AA:BB:CC:DD:EE:FF")
    var dbg = S.find("debug", false)
    var bs = S.find("brighStep", 10)
    var bn = S.find("brighMin", 0)
    var bx = S.find("brighMax", 100)

    # g = selected group: 1 means id1, 2 means id2, 3 means both.
    # v1/v2 are local brightness caches for id1/id2.
    # ls stores the last remote sequence so duplicate channel sends are ignored.
    var g = S.find("group", 3)
    var v1 = S.find("brigh1", S.find("brigh", 50))
    var v2 = S.find("brigh2", S.find("brigh", 50))
    var ls = -1

    # z is clamp(v, lo, hi). It is short because it is called on each step.
    def z(v, lo, hi)
        if v < lo
            return lo
        elif v > hi
            return hi
        end
        return v
    end

    # rx args: a = sender MAC, x = payload bytes, r = RSSI, ch = Wi-Fi channel.
    def rx(a, x, r, ch)
        # 13 = GLEDOPTO GL-RC-001WL payload size.
        if x.size() != 13
            return
        end

        # 129/145 = 0x81/0x91 program prefixes observed on this remote.
        var p = x.get(0)
        if p != 129 && p != 145
            return
        end

        # Bytes 1..4 dedupe the same press repeated on multiple Wi-Fi channels.
        var s = x.get(1, 4)
        if s == ls
            return
        end
        ls = s

        # Byte 6 is the button code: 1 ON, 2 OFF, 3 moon, 8/9 brightness, 16..19 S1..S4.
        var k = x.get(6)

        # Any accepted click disables D_ena for both controlled IDs.
        e1.set(0, 30)
        e2.set(0, 30)

        if dbg
            # Studio-visible MAC discovery. LABEL values are label_t-sized, so
            # AA:BB:CC:DD:EE:FF is split into mac1=AABB, mac2=CCDD, mac3=EEFF.
            EVS.emit("mac1", a[0..1] + a[3..4], i1, 31)
            EVS.emit("mac2", a[6..7] + a[9..10], i1, 31)
            EVS.emit("mac3", a[12..13] + a[15..16], i1, 31)
            EVS.emit("mac1", a[0..1] + a[3..4], i2, 31)
            EVS.emit("mac2", a[6..7] + a[9..10], i2, 31)
            EVS.emit("mac3", a[12..13] + a[15..16], i2, 31)
            print("GLEDOPTO two-id-select", a, "btn", k, "group", g, "rssi", r, "ch", ch, x.tohex())
        end

        # S1 selects id1.
        if k == 16
            g = 1

        # S2 selects id2.
        elif k == 17
            g = 2

        # S3 selects both ids.
        elif k == 18
            g = 3

        # S4 also selects both ids.
        elif k == 19
            g = 3

        # Brightness plus affects only the selected group and forces toggl ON.
        elif k == 9
            if g != 2
                v1 = z(v1 + bs, 0, 100)
                b1.set(v1, 30)
                t1.set(100, 30)
            end
            if g != 1
                v2 = z(v2 + bs, 0, 100)
                b2.set(v2, 30)
                t2.set(100, 30)
            end

        # Brightness minus affects only the selected group and forces toggl ON.
        elif k == 8
            if g != 2
                v1 = z(v1 - bs, 0, 100)
                b1.set(v1, 30)
                t1.set(100, 30)
            end
            if g != 1
                v2 = z(v2 - bs, 0, 100)
                b2.set(v2, 30)
                t2.set(100, 30)
            end

        # ON/OFF ignore the selected S group and always act on both IDs.
        elif k == 1
            v1 = bx
            v2 = bx
            b1.set(v1, 30)
            b2.set(v2, 30)
        elif k == 2
            v1 = bn
            v2 = bn
            b1.set(v1, 30)
            b2.set(v2, 30)

        # 3 = moon: intentionally no light action; D_ena was already disabled.
        elif k == 3
            g = g
        elif dbg
            print("GLEDOPTO two-id-select ignored", k, x.tohex())
        end
    end

    # Native ESP-NOW filter runs in C++ before Berry.
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
    var h = espnow.rx(f, rx)

    return Plugin(def()
        # All work is done by rx().
    end)
end
