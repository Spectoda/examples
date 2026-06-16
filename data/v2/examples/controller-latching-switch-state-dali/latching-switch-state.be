def LatchingSwitchState(S)
    var input = S["in"]
    var evs = S["evs"]
    var on_value = S.find("on_value", 1)
    var emit_initial = S.find("emit_initial", true)
    var raw = input.read() == 0 ? 0 : 1
    var last = raw == on_value ? 1 : 0
    var first = emit_initial ? 1 : 0

    return Plugin(def()
        raw = input.read() == 0 ? 0 : 1
        var state = raw == on_value ? 1 : 0

        if !first && state == last
            return
        end

        first = 0
        last = state
        var pct = state ? 100 : 0

        for e : evs
            e.set(pct, PERCENTAGE)
        end
    end)
end
