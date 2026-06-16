import controller

controller.ups = 50

def AnalogPotEvent(S)
    var input = S["in"]
    var evs = S["evs"]
    var samples = S.find("samples", 4)
    var poll_ms = S.find("poll_ms", 20)
    var deadband = S.find("deadband", 0.5)
    var max_raw = S.find("maxraw", 4095.0)
    var last_pct = nil
    var last_poll = -1000

    if samples < 1
        samples = 1
    end

    if poll_ms < 1
        poll_ms = 1
    end

    if deadband < 0
        deadband = 0
    end

    if max_raw <= 0
        max_raw = 4095.0
    end

    return Plugin(def()
        var now = controller.millis()

        if now - last_poll < poll_ms
            return
        end

        last_poll = now

        var sum = 0
        for i : 0 .. samples - 1
            sum = sum + input.read(1)
        end

        var raw = real(sum) / real(samples)

        if raw < 0
            raw = 0
        elif raw > max_raw
            raw = max_raw
        end

        var pct_real = raw * 100.0 / max_raw
        var pct = int(pct_real + 0.5)

        if pct < 0
            pct = 0
        elif pct > 100
            pct = 100
        end

        var should_emit = last_pct == nil

        if last_pct != nil && pct != last_pct
            if pct == 0 || pct == 100
                should_emit = true
            elif pct > last_pct
                should_emit = pct_real >= real(last_pct) + 0.5 + deadband
            else
                should_emit = pct_real <= real(last_pct) - 0.5 - deadband
            end
        end

        if should_emit
            last_pct = pct
            evs.set(pct, PERCENTAGE)
        end
    end)
end
