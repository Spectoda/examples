


def Player(s)
var b=s.find("base","player")
var ids=s.find("ids",[])
var d=s.find("debug",false)
if type(b)!="string" || size(b)<1 || size(b)>11 ||
type(ids)!="instance" || classname(ids)!="list"
raise "value_error","invalid Player config"
end
for j:0..size(b)-1
var c=b[j]
if !((c>="A"&&c<="Z")||(c>="a"&&c<="z")||
(c>="0"&&c<="9")||c=="_"||c=="-")
raise "value_error","invalid Player base"
end
end
var w={}
for i:ids
if type(i)!="int" || i<0 || i>254 || w.find(i,false)
raise "value_error","local IDs must be unique 0..254"
end
w[i]=true
end
var R=[false,[],false,0,0,0,-1]
def wanted(i)return i==255 || w.find(i,false)end
def n3(n)
if n<10 return "00"+str(n)end
if n<100 return "0"+str(n)end
return str(n)
end
def file(i,n)return b+"."+n3(i)+"."+n3(n)+".seb" end

def load(x)
var z=spectoda.getNetworkStorageData(b+".show")
if z==nil || z.size()<16 || z.size()>4096 ||
z.get(0)!=80 || z.get(1)!=83 || z.get(2)!=72 ||
z.get(3)!=1 || z.get(4)!=16 || z.get(5)!=0 ||
z.get(12,4)!=0
return false
end
var c=z.get(6,2)
var duration=z.get(8,4)
if c<1 || c>256 || duration<1 || duration>86400000
return false
end
var tracks=[]
var p=16
var previous_id=-1
for ti:0..c - 1
if p+8>z.size()return false end
var id=z.get(p)
var rpc=z.get(p+2,2)
var sc=z.get(p+4,2)
if z.get(p+1)!=0 || z.get(p+6,2)!=0 ||
id<=previous_id || rpc<1 || rpc>340 || sc<1
return false
end
previous_id=id
p+=8
var segments=[]
var previous_base=-1
for si:0..sc - 1
if p+8>z.size()return false end
var base=z.get(p,4)
var cc=z.get(p+4,2)
if z.get(p+6,2)!=0 || cc<1 || rpc*cc>340 ||
base<=previous_base || base>=duration ||
(si==0 && base !=0)|| p+8+cc*2>z.size()
return false
end
p+=8
previous_base=base
var offsets=[]
var previous_offset=-1
for ci:0..cc - 1
var offset=z.get(p,2)
p+=2
if(ci==0 && offset !=0)||
(ci>0 && offset<=previous_offset)||
base+offset>=duration
return false
end
previous_offset=offset
offsets.push(offset)
end
segments.push([base,offsets])
end
if wanted(id)tracks.push([id,rpc,segments,0,0])end
end
if p !=z.size()return false end
R[0]=true R[1]=tracks R[2]=false R[3]=0 R[4]=x
return true
end

def advance(t,si,ci)
ci+=1
if ci>=t[2][si][1].size()si+=1 ci=0 end
t[3]=si
t[4]=ci
end

def reconcile()
if R[3]>=R[1].size()R[2]=true return true end
var t=R[1][R[3]]
var bs=0
var bc=0
var found=false
for si:0..t[2].size()- 1
var seg=t[2][si]
for ci:0..seg[1].size()- 1
if seg[0]+seg[1][ci]<=R[4]
bs=si bc=ci found=true
end
end
end
if !found return false end
var o=t[2][bs][1][bc]
var at=timeline.at(R[4]- o)
if at==nil return false end
var cur=bc*t[1]
var q=SEB.land(file(t[0],bs),{"source":"networkStorage",
"at":at,"cursor":cur,"until":o})
if !q["ok"]|| q["cursor"]!=cur+t[1]
if d print("Player reconcile",t[0],q["error"])end
return false
end
t[3]=bs t[4]=bc advance(t,bs,bc)R[3]+=1
return true
end

def forward(x)
var pick=nil
var due=nil
for t:R[1]
if t[3]<t[2].size()
var seg=t[2][t[3]]
var n=seg[0]+seg[1][t[4]]
if n<=x &&(pick==nil || n<due)pick=t due=n end
end
end
if pick==nil return true end
var si=pick[3]
var seg=pick[2][si]
var at=timeline.at(seg[0])
if at==nil return false end
var until=x - seg[0]
if until>65535 until=65535 end
var cur=pick[4]*pick[1]
var q=SEB.land(file(pick[0],si),{"source":"networkStorage",
"at":at,"cursor":cur,"until":until})
if !q["ok"]|| q["cursor"]<=cur || q["cursor"]%pick[1]!=0
if d print("Player forward",pick[0],q["error"])end
return false
end
var n=int(q["cursor"]/ pick[1])
if n>=seg[1].size()pick[3]=si+1 pick[4]=0
else pick[4]=n end
return true
end

return Plugin(def()
var s=timeline.getState()
var x=s["time"]
var e=s["epoch"]
if !R[0]|| e !=R[6]|| x<R[5]
if !load(x)
R[0]=false
if d print("Player show unavailable",b+".show")end
return
end
end
var ok=true
if !R[2]ok=reconcile()
elif !s["paused"]ok=forward(x)end
if ok R[5]=x R[6]=e end
end)
end
