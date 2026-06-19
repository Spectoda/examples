import espnow

# Standalone raw Controller Berry script. Paste this file into the Controller
# Berry script editor directly. Do not wrap it in BERRY(`...`).
def GledoptoRemoteTwoIdSelect(S)
    if S == nil
        S = {}
    end

    var i1 = S.find("id1", 1)
    var i2 = S.find("id2", 101)

    var b1 = EVS("brigh", i1)
    var b2 = EVS("brigh", i2)
    var t1 = EVS("toggl", i1)
    var t2 = EVS("toggl", i2)
    var e1 = EVS("D_ena", i1)
    var e2 = EVS("D_ena", i2)

    var m = S.find("mac", "")
    var mf = S.find("macFilter", m != "" && m != "AA:BB:CC:DD:EE:FF")
    var dbg = S.find("debug", false)
    var bs = S.find("brighStep", 10)
    var bn = S.find("brighMin", 0)
    var bx = S.find("brighMax", 100)

    var g = S.find("group", 3)
    var v1 = S.find("brigh1", S.find("brigh", 50))
    var v2 = S.find("brigh2", S.find("brigh", 50))
    var ls = -1

    def z(v, lo, hi)
        if v < lo
            return lo
        elif v > hi
            return hi
        end
        return v
    end

    def rx(a, x, r, ch)
        if x.size() != 13
            return
        end

        var p = x.get(0)
        if p != 129 && p != 145
            return
        end

        var s = x.get(1, 4)
        if s == ls
            return
        end
        ls = s

        var k = x.get(6)

        e1.set(0, 30)
        e2.set(0, 30)

        if dbg
            EVS.emit("mac1", a[0..1] + a[3..4], i1, 31)
            EVS.emit("mac2", a[6..7] + a[9..10], i1, 31)
            EVS.emit("mac3", a[12..13] + a[15..16], i1, 31)
            EVS.emit("mac1", a[0..1] + a[3..4], i2, 31)
            EVS.emit("mac2", a[6..7] + a[9..10], i2, 31)
            EVS.emit("mac3", a[12..13] + a[15..16], i2, 31)
            print("GLEDOPTO two-id-select", a, "btn", k, "group", g, "rssi", r, "ch", ch, x.tohex())
        end

        if k == 16
            g = 1
        elif k == 17
            g = 2
        elif k == 18
            g = 3
        elif k == 19
            g = 3
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
        elif k == 3
            g = g
        elif dbg
            print("GLEDOPTO two-id-select ignored", k, x.tohex())
        end
    end

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
    end)
end

GledoptoRemoteTwoIdSelect({
    "id1": 1,
    "id2": 101,
    # Keep mac commented during discovery, so the controller can receive any
    # GLEDOPTO remote and publish mac1/mac2/mac3 label events in Studio.
    # "mac": "AA:BB:CC:DD:EE:FF",
    "debug": true,
    "brigh": 50,
    "brighStep": 10,
    "brighMin": 0,
    "brighMax": 100
})
