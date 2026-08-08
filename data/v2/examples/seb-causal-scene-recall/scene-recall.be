# Project Berry for firmware 0.12.11.
#
# A broadcast $scene[ID255] LABEL event loads <label>.seb from NetworkStorage.
# The trigger itself must not be part of the compiled scene.
def SceneRecall(S)
    var label = S.find("label", "scene")
    var id = S.find("id", 255)
    var extension = S.find("extension", ".seb")
    var trigger = EVS(label, id)
    var last_millis = nil

    trigger.cb = def(value, event_id, event_millis)
        if event_millis == nil || event_millis == last_millis || !value.is(31)
            return
        end

        last_millis = event_millis
        var name = value.get(31) + extension
        var result = SEB.land(name, {
            "source": "networkStorage",
            "at": event_millis
        })
        if !result["ok"]
            print("SceneRecall failed", name, result["error"])
        end
    end

    return Plugin(nil)
end

SceneRecall({"label": "scene", "id": ID255})
