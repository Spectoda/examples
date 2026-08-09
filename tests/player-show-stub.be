# Host-Berry lifecycle smoke for player.show SPM v3.
import json
import string

spectoda=nil
timeline=nil
SEB=nil
stub_state=nil
Player=nil

class SpectodaStub
    var files,reads,metadata_reads,max_range
    def init(fixture)
        self.files={}
        self.reads=[]
        self.metadata_reads=0
        self.max_range=0
        for item:fixture["files"]
            self.files[item["name"]]={"bytes":bytes(item["hex"]),
                                      "version":item["version"]}
        end
    end
    def listNetworkStorageData()
        self.metadata_reads+=1
        var result=[]
        for name:self.files.keys()
            var file=self.files[name]
            if file!=nil
                result.push({"name":name,"version":file["version"],
                             "fingerprint":file["bytes"].asstring()})
            end
        end
        return result
    end
    def getNetworkStorageData(name,*args)
        if self.reads!=nil self.reads.push([name,args]) end
        var file=self.files.find(name,nil)
        if file==nil return nil end
        var data=file["bytes"]
        if args.size()==0 return data end
        assert(args.size()==2)
        var offset=args[0]
        var length=args[1]
        if length>self.max_range self.max_range=length end
        if offset>data.size() return nil end
        if offset==data.size() return bytes() end
        var available=data.size()-offset
        if length>available length=available end
        return data[offset..offset+length-1]
    end
end

class TimelineStub
    var state,local_now,projection_failures
    def init()
        self.state={"time":0,"paused":true,"epoch":1}
        self.local_now=1000
        self.projection_failures=0
    end
    def getState() return self.state end
    def at(position)
        if self.projection_failures>0
            self.projection_failures-=1
            return nil
        end
        return self.local_now+position-self.state["time"]
    end
end

class SebStub
    var applied,calls
    def init()
        self.applied=[]
        self.calls=[]
    end
    def land(name,args)
        var original=args.find("cursor",0)
        self.calls.push({"name":name,"args":args})
        if args.find("source",nil)!="networkStorage"
            return {"ok":false,"cursor":original,"consumed":0,"error":"source"}
        end
        var file=spectoda.files.find(name,nil)
        if file==nil return {"ok":false,"cursor":original,"consumed":0,"error":"file"} end
        var data=file["bytes"]
        var records=data.get(6,2)
        if data.size()!=12+records*12
            return {"ok":false,"cursor":original,"consumed":0,"error":"length"}
        end
        var previous=-1
        for i:0..records-1
            var offset=data.get(20+i*12,2)
            if offset<previous||offset>data.get(8,2)
                return {"ok":false,"cursor":original,"consumed":0,"error":"offset"}
            end
            previous=offset
        end
        var cursor=original
        var consumed=0
        var until=args.find("until",0)
        while cursor<records&&data.get(20+cursor*12,2)<=until
            var p=12+cursor*12
            self.applied.push({"value":data.get(p,4),"offset":data.get(p+8,2),
                               "id":data.get(p+10),"at":args["at"]})
            cursor+=1
            consumed+=1
        end
        return {"ok":true,"cursor":cursor,"consumed":consumed,"error":nil}
    end
end

def fixture()
    var f=open("data/v2/examples/player-show-global-sparse-cues/player-show-artifacts.json","r")
    var value=json.load(f.read())
    f.close()
    return value
end

def many_segments(n)
    var z=bytes(12+n*10)
    z.resize(12+n*10)
    z[0]=83 z[1]=80 z[2]=77 z[3]=3 z[4]=12 z[5]=0
    z.set(6,n,2) z.set(8,n*1000+1,4)
    var files=[]
    for i:0..n-1
        z.set(12+i*10,256+i,4) z.set(16+i*10,0,2)
        z.set(18+i*10,i*1000,4)
        var name=nil
        if i<10 name="player.00"+str(i)
        elif i<100 name="player.0"+str(i)
        else name="player."+str(i)
        end
        files.push({"name":name,"version":string.format("%012x",256+i),
                    "hex":"534542010c00010000000c00000000000000000000000000"})
    end
    files.push({"name":"player.show","version":"000000000001",
                "hex":z.tohex()})
    return {"files":files}
end

stub_state={"callback":nil}
def Plugin(callback)
    stub_state["callback"]=callback
    return callback
end

def boot(f)
    spectoda=SpectodaStub(f)
    timeline=TimelineStub()
    SEB=SebStub()
    stub_state["callback"]=nil
    # Project injection evaluates the Player once; no public callable or invocation.
    compile("data/v2/examples/player-show-global-sparse-cues/player.be","file")()
end

# Activation while paused reconciles the last Cue at or before the target.
boot(fixture())
stub_state["callback"]()
assert(SEB.calls.size()==1)
assert(spectoda.files["player.000"]["version"]=="0198a1b2c3d4")
assert(SEB.calls[0]["args"]["cursor"]==0)
assert(SEB.calls[0]["args"]["until"]==0)
assert(SEB.applied.size()==3)

# Resume does not repeat the reconciled Cue; later playback remains sparse.
timeline.state["paused"]=false
stub_state["callback"]()
assert(SEB.calls.size()==1)
assert(SEB.calls[0]["name"]=="player.000")
assert(SEB.applied.size()==3)
assert(SEB.applied[0]["id"]==1)
assert(SEB.applied[1]["id"]==1)
assert(SEB.applied[2]["id"]==255)
timeline.local_now=2000
timeline.state["time"]=1000
stub_state["callback"]()
assert(SEB.applied.size()==5)
assert(SEB.applied[3]["id"]==1)
assert(SEB.applied[4]["id"]==2)
timeline.local_now=6000
timeline.state["time"]=5000
stub_state["callback"]()
assert(SEB.applied.size()==7)
timeline.local_now=71000
timeline.state["time"]=70000
stub_state["callback"]()
assert(SEB.calls[3]["name"]=="player.001")
assert(SEB.calls[3]["args"]["until"]==4464)
assert(SEB.applied.size()==9)

# A paused exact seek lands that Cue once at the seek's causal local time.
timeline.state={"time":5000,"paused":true,"epoch":2}
timeline.local_now=20000
stub_state["callback"]()
assert(SEB.calls.size()==5)
assert(SEB.calls[4]["args"]["cursor"]==5)
assert(SEB.calls[4]["args"]["at"]+5000==timeline.local_now)
assert(SEB.applied.size()==11)
timeline.state["paused"]=false
stub_state["callback"]()
assert(SEB.calls.size()==5)
assert(SEB.applied.size()==11)
assert(SEB.applied[9]["offset"]==5000)
assert(SEB.applied[10]["offset"]==5000)

# Between Cues, seek lands only the immediately preceding sparse Cue and
# rebases it to the seek time. It never lands the future 5 s Cue.
timeline.state={"time":4000,"paused":true,"epoch":3}
stub_state["callback"]()
assert(SEB.calls.size()==6)
assert(SEB.calls[5]["args"]["cursor"]==3)
assert(SEB.calls[5]["args"]["until"]==1000)
assert(SEB.calls[5]["args"]["at"]+1000==timeline.local_now)
assert(SEB.applied.size()==13)
timeline.state["paused"]=false
stub_state["callback"]()
assert(SEB.calls.size()==6)
timeline.state["time"]=5000
timeline.local_now=21000
stub_state["callback"]()
assert(SEB.calls.size()==7)
assert(SEB.calls[6]["args"]["cursor"]==5)

# A 24-hour epoch/wrap reconciles the first Cue once while still paused.
timeline.state={"time":0,"paused":true,"epoch":4}
stub_state["callback"]()
assert(SEB.calls.size()==8)
assert(SEB.calls[7]["args"]["cursor"]==0)
timeline.state["paused"]=false
stub_state["callback"]()
assert(SEB.calls.size()==8)

# Missing or mismatched exact slot versions fail inactive until they arrive.
var missing=fixture()
boot(missing)
spectoda.files["player.000"]["version"]="0198a1b2c3d5"
stub_state["callback"]()
timeline.state["paused"]=false
stub_state["callback"]()
assert(SEB.calls.size()==0)
spectoda.files["player.000"]["version"]="0198a1b2c3d4"
for i:0..49 stub_state["callback"]() end
assert(SEB.calls.size()==1)

# A fixed slot that changes after activation is checked again before landing.
boot(fixture())
stub_state["callback"]()
spectoda.files["player.000"]["version"]="0198a1b2c3d5"
timeline.state["paused"]=false
timeline.state["time"]=1000
stub_state["callback"]()
assert(SEB.calls.size()==1)

# A newer manifest also disarms the old schedule before its next landing, even
# when the resident segment bytes and version are unchanged.
boot(fixture())
stub_state["callback"]()
spectoda.files["player.show"]["version"]="0198a1b2d101"
timeline.state["paused"]=false
timeline.state["time"]=1000
stub_state["callback"]()
assert(SEB.calls.size()==1)

# Exact EOF and unsupported manifest versions fail closed.
var bad=fixture()
for item:bad["files"]
    if item["name"]=="player.show" item["hex"]+="00" end
end
boot(bad)
stub_state["callback"]()
assert(SEB.calls.size()==0)
bad=fixture()
for item:bad["files"]
    if item["name"]=="player.show" item["hex"]="53504d02"+item["hex"][8..] end
end
boot(bad)
stub_state["callback"]()
assert(SEB.calls.size()==0)
bad=fixture()
for item:bad["files"]
    # Move player.001 inside player.000's 0..5000 ms covered window.
    if item["name"]=="player.show" item["hex"]=item["hex"][0..55]+"e8030000" end
end
boot(bad)
stub_state["callback"]()
assert(SEB.calls.size()==0)

# Native SEB validation rejects malformed records before applying a due prefix.
bad=fixture()
for item:bad["files"]
    # A compiled segment always starts at offset zero. Fail inactive rather
    # than falling back to segment zero when malformed bytes violate it.
    if item["name"]=="player.000"
        item["hex"]=item["hex"][0..39]+"0100"+item["hex"][44..]
    end
end
boot(bad)
stub_state["callback"]()
assert(SEB.calls.size()==0&&SEB.applied.size()==0)
bad=fixture()
for item:bad["files"]
    if item["name"]=="player.000"
        item["hex"]=item["hex"][0..39]+"8913"+item["hex"][44..]
    end
end
boot(bad)
stub_state["callback"]()
timeline.state["paused"]=false
timeline.state["time"]=5001
stub_state["callback"]()
assert(SEB.calls.size()==0&&SEB.applied.size()==0)
bad=fixture()
for item:bad["files"]
    if item["name"]=="player.000"
        item["hex"]=item["hex"][0..135]+"f401"+item["hex"][140..]
    end
end
boot(bad)
stub_state["callback"]()
assert(SEB.calls.size()==1&&SEB.applied.size()==0)

# A nil causal projection leaves cursor and EventStore untouched and retries.
boot(fixture())
timeline.projection_failures=1
stub_state["callback"]()
assert(SEB.calls.size()==0)
stub_state["callback"]()
assert(SEB.calls.size()==1)

# A realistic 50-segment show retains only its compact manifest. Berry never
# requests an entire SEB while activating or seeking; the largest range is the
# 32-record (384-byte) seek window.
boot(many_segments(50))
spectoda.reads=nil
stub_state["callback"]()
assert(spectoda.max_range<=384)

# Public API shape and one-block budget.
var f=open("data/v2/examples/player-show-global-sparse-cues/player.be","r")
var source=f.read()
f.close()
assert(size(source)<=4093)
assert(string.find(source,"timeline.at")>=0)
assert(string.find(source,"timeline.toMillis")<0)
assert(string.find(source,'"source":"networkStorage"')>=0)
assert(string.find(source,'find("ids"')<0)
assert(string.find(source,'find("base"')<0)
assert(string.find(source,"def Player")<0)
print("player.show SPM v3 mixed-ID sparse-Cue lifecycle smoke: PASS")
