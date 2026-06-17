def OnClickToggleGroup(S)
    var in = S["in"]
    var evs = S["evs"]
    var cc = ClickCounter(S)

    return Plugin(def()
        if cc.update(in.read())
            if cc.clicked() == 1
                var any_on = 0

                for e : evs
                    if e
                        any_on = 1
                    end
                end

                var v = any_on ? 0 : 100

                for e : evs
                    e.set(v, PERCENTAGE)
                end
            end
        end
    end)
end
