(def()
# R: version, manifest, seg, cursor, time, epoch, poll, count, next.
var R=[nil,nil,0,0,-1,-1,0,0,0]
def name(i)
if i<10 return "player.00"+str(i) end
if i<100 return "player.0"+str(i) end
return "player."+str(i)
end
def same(z,p,v)
if type(v)!="string"||size(v)!=12 return false end
var b=bytes(v,-6)
for i:0..5
if z.get(p+i)!=b[5-i] return false end
end
return true
end
def head(i,st,dur)
var n=name(i) var h=spectoda.getNetworkStorageData(n,0,12)
if h==nil||h.size()!=12||h.get(0)!=83||h.get(1)!=69||
h.get(2)!=66||h.get(3)!=1||h.get(4)!=12||h.get(5)!=0||
h.get(10)!=12||h.get(11)!=0 return nil end
var c=h.get(6,2) var t=h.get(8,2)
if c<1||c>340||st+t>=dur return nil end
var e=spectoda.getNetworkStorageData(n,11+c*12,2)
if e==nil||e.size()!=1 return nil end
return (c<<16)|t
end
def ready(L,z)
var n=z.get(6,2) var c=0
for m:L
var k=m.find("name",nil) var v=m.find("version",nil)
if type(k)=="string"&&size(k)==10&&k[0..6]=="player."
var i=int(k[7..9])
if i<n&&k==name(i)
if !same(z,12+i*10,v)return false end
c+=1
end
end
end
return c==n
end
def valid(i,z,L)
if L==nil L=spectoda.listNetworkStorageData() end
var fn=name(i) var p=12+i*10 var c=0
for m:L
var k=m.find("name",nil) var v=m.find("version",nil)
if k=="player.show"
if v!=R[0]return false end
c+=1
elif k==fn
if !same(z,p,v)return false end
c+=1
end
if c==2 break end
end
return c==2
end
def seek(x,L)
var z=R[1] var n=z.get(6,2)
R[2]=0 R[3]=0 R[7]=0 R[8]=0
if n==0 return true end
var k=0
while k+1<n&&z.get(28+k*10,4)<=x k+=1 end
var st=z.get(18+k*10,4)
if st>x return true end
var h=head(k,st,z.get(8,4))
if h==nil return false end
var count=h>>16 var c=0 var u=x-st var next=0 var g=0 var o=-1
while c<count
var q=count-c if q>32 q=32 end
var b=spectoda.getNetworkStorageData(name(k),12+c*12,q*12)
if b==nil||b.size()!=q*12 return false end
var j=0
while j<q
var v=b.get(8+j*12,2)
if v>u next=v break end
if v!=o g=c+j o=v end
j+=1
end
c+=j
if j<q break end
end
if o<0 return false end
if !valid(k,z,L)return false end
var at=timeline.at(x-o)
if at==nil return nil end
var q=SEB.land(name(k),{"source":"networkStorage","at":at,
"cursor":g,"until":o})
if !q["ok"]return false end
c=q["cursor"]
if c>=count R[2]=k+1
else R[2]=k R[3]=c R[7]=count R[8]=next
end
return true
end
def load(L,v)
var z=spectoda.getNetworkStorageData("player.show")
if z==nil||z.size()<12||z.get(0)!=83||z.get(1)!=80||
z.get(2)!=77||z.get(3)!=3||z.get(4)!=12||z.get(5)!=0 return false end
var n=z.get(6,2) var dur=z.get(8,4)
if n>1000||dur<1||dur>86400000||z.size()!=12+n*10||!ready(L,z)
return false end
var last=-1 var lastend=-1
for i:0..n-1
var st=z.get(18+i*10,4)
var h=head(i,st,dur)
if st<=last||st<=lastend||st>=dur||h==nil return false end
last=st lastend=st+(h&65535)
end
R[0]=v R[1]=z R[5]=-1
return true
end
def forward(x,L)
var z=R[1] var n=z.get(6,2)
if R[2]>=n return true end
var st=z.get(18+R[2]*10,4)
if st+R[8]>x return true end
if R[7]==0
var h=head(R[2],st,z.get(8,4))
if h==nil return false end
R[7]=h>>16
end
if !valid(R[2],z,L)return false end
var fn=name(R[2])
var at=timeline.at(st)
if at==nil return true end
var u=x-st
if u>65535 u=65535 end
var q=SEB.land(fn,{"source":"networkStorage","at":at,
"cursor":R[3],"until":u})
if !q["ok"]return false end
R[3]=q["cursor"]
if R[3]>=R[7]
R[2]+=1 R[3]=0 R[7]=0 R[8]=0
else
var o=spectoda.getNetworkStorageData(fn,20+R[3]*12,2)
if o==nil||o.size()!=2 return false end
R[8]=o.get(0,2)
end
return true
end
Plugin(def()
var s=timeline.getState() var x=s["time"] var e=s["epoch"]
var L=nil
R[6]-=1
if R[6]<=0
R[6]=50
L=spectoda.listNetworkStorageData()
var v=nil
for m:L
if m.find("name",nil)=="player.show" v=m.find("version",nil) break end
end
if v==nil R[1]=nil
elif R[1]==nil||v!=R[0]
if !load(L,v)R[1]=nil end
elif !ready(L,R[1])R[1]=nil
end
end
if R[1]==nil return end
if e!=R[5]||x<R[4]
var q=seek(x,L)
if q==false R[1]=nil return end
if q==nil return end
end
if !s["paused"]
var ok=forward(x,L)
if ok==false R[1]=nil return end
end
R[4]=x R[5]=e
end)
end)()
