"""Rebuild transparent rasters and SMIL from .export vectors.
Requires Python 3 + Pillow + NumPy + librsvg-2 + cairo shared libraries.
Run node tools/export-vectors.mjs first. No network access is used.
"""
from pathlib import Path
from copy import deepcopy
import ctypes as C, xml.etree.ElementTree as E, json,re,io
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
r=C.CDLL('librsvg-2.so.2');c=C.CDLL('libcairo.so.2');g=C.CDLL('libgobject-2.0.so.0')
r.rsvg_handle_new_from_data.argtypes=[C.c_void_p,C.c_size_t,C.c_void_p];r.rsvg_handle_new_from_data.restype=C.c_void_p
r.rsvg_handle_render_cairo.argtypes=[C.c_void_p,C.c_void_p];r.rsvg_handle_render_cairo.restype=C.c_int
c.cairo_image_surface_create.argtypes=[C.c_int,C.c_int,C.c_int];c.cairo_image_surface_create.restype=C.c_void_p
c.cairo_create.argtypes=[C.c_void_p];c.cairo_create.restype=C.c_void_p
c.cairo_scale.argtypes=[C.c_void_p,C.c_double,C.c_double];c.cairo_image_surface_get_data.argtypes=[C.c_void_p];c.cairo_image_surface_get_data.restype=C.c_void_p
c.cairo_surface_flush.argtypes=[C.c_void_p];c.cairo_destroy.argtypes=[C.c_void_p];c.cairo_surface_destroy.argtypes=[C.c_void_p];g.g_object_unref.argtypes=[C.c_void_p]
def render(svg,size):
 b=svg.encode();h=r.rsvg_handle_new_from_data(b,len(b),None);assert h
 s=c.cairo_image_surface_create(0,size,size);ctx=c.cairo_create(s);c.cairo_scale(ctx,size/256,size/256)
 assert r.rsvg_handle_render_cairo(h,ctx);c.cairo_surface_flush(s)
 a=np.frombuffer(C.string_at(c.cairo_image_surface_get_data(s),size*size*4),dtype=np.uint8).reshape(size,size,4).copy()[:,:,[2,1,0,3]]
 c.cairo_destroy(ctx);c.cairo_surface_destroy(s);g.g_object_unref(h)
 alpha=a[:,:,3:4].astype(np.float32);rgb=a[:,:,:3].astype(np.float32)
 a[:,:,:3]=np.clip(np.round(np.divide(rgb*255,alpha,out=np.zeros_like(rgb),where=alpha>0)),0,255).astype(np.uint8)
 return Image.fromarray(a,'RGBA')
def wrap(defs,body):return f'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="-30 -30 60 60">{defs}{body}</svg>'
def save_rasters(file):
 im=render(file.read_text(),256);im.save(file.with_suffix('.png'));im.save(file.with_suffix('.webp'),lossless=True);return im

def smil(data,file):
 frames=[E.fromstring(s) for s in data['frames']];maps=[{e.get('id'):e for e in f.iter() if e.get('id')} for f in frames];n=len(frames)
 root=E.Element('svg',{'xmlns':'http://www.w3.org/2000/svg','viewBox':'-30 -30 60 60','width':'256','height':'256','role':'img','aria-label':'Geeky '+file.parent.name})
 E.SubElement(root,'title').text='Geeky / '+file.parent.name
 E.SubElement(root,'desc').text='4-second looping transparent vector animation. Original black pupils and white highlights. Script-free SMIL. Use poster.svg for reduced motion.'
 root.append(E.fromstring(data['defs']));body=deepcopy(frames[0]);root.append(body)
 def anim(node,attr,vals,typ=None):
  if len(set(vals))==1:node.set(attr,f'{typ}({vals[0]})' if typ else vals[0]);return
  keep=[0]+[i for i in range(1,n-1) if not(vals[i-1]==vals[i]==vals[i+1])]+[n-1]
  a={'attributeName':'transform','type':typ} if typ else {'attributeName':attr}
  a.update({'dur':'4s','repeatCount':'indefinite','calcMode':'linear','values':';'.join(vals[i] for i in keep),'keyTimes':';'.join(f'{i/(n-1):.7f}' for i in keep)})
  E.SubElement(node,'animateTransform' if typ else 'animate',a)
 for e in [x for x in body.iter() if x.get('id')]:
  present=[m[e.get('id')] for m in maps];sample=present[0]
  for attr in ['opacity','height','y','d']:
   if attr not in sample.attrib:continue
   anim(e,attr,[x.get(attr) for x in present])
  tr=[x.get('transform','') for x in present]
  if len(set(tr))==1:continue
  ops=[re.findall(r'(translate|rotate|scale|skewX|skewY)\(([^)]*)\)',t) for t in tr]
  assert len(set(len(o) for o in ops))==1
  parent=next(x for x in root.iter() if e in list(x));idx=list(parent).index(e);parent.remove(e);outer=inner=None
  for j,(typ,_) in enumerate(ops[0]):
   vals=[' '.join(re.split(r'[,\s]+',o[j][1].strip())) for o in ops]
   group=E.Element('g',{'transform':f'{typ}({vals[0]})'});anim(group,'transform',vals,typ)
   if outer is None:outer=group
   else:inner.append(group)
   inner=group
  e.attrib.pop('transform',None);inner.append(e);parent.insert(idx,outer)
 file.write_text(E.tostring(root,encoding='unicode'))

def main():
 report={'states':[],'gazes':16,'renderEngine':'librsvg + cairo','alpha':'unpremultiplied RGBA','bounds':[]}
 for datafile in sorted((ROOT/'.export').glob('*.json')):
  id=datafile.stem;data=json.loads(datafile.read_text());folder=ROOT/'assets/states'/id
  smil(data,folder/'animation.svg');poster=save_rasters(folder/'poster.svg')
  frames=[render(wrap(data['defs'],x),256) for x in data['frames'][:-1]]
  atlas=Image.new('RGBA',(1024,1536))
  for i,im in enumerate(frames):
   atlas.paste(im.resize((128,128),Image.Resampling.LANCZOS),(i%8*128,i//8*128))
   bb=im.getbbox();assert bb and bb[0]>0 and bb[1]>0 and bb[2]<256 and bb[3]<256,(id,i,bb)
  atlas.save(folder/'sprites.png');atlas.save(folder/'sprites.webp',lossless=True)
  samples=frames[::2];dur=[80,80,90]*16
  samples[0].save(folder/'animation.webp',save_all=True,append_images=samples[1:],duration=[83,83,84]*16,loop=0,lossless=True,minimize_size=False)
  # Reserve palette entry 255 for alpha. GIF necessarily has binary transparency.
  gifs=[]
  for im in samples:
   flat=Image.new('RGB',im.size,'white');flat.paste(im,mask=im.getchannel('A'));pal=flat.quantize(colors=255,method=Image.Quantize.MEDIANCUT)
   mask=im.getchannel('A').point(lambda a:255 if a<128 else 0);pal.paste(255,mask=mask);pal.info['transparency']=255;gifs.append(pal)
  gifs[0].save(folder/'animation.gif',save_all=True,append_images=gifs[1:],duration=dur,loop=0,transparency=255,disposal=2,optimize=False)
  w=Image.open(folder/'animation.webp');gf=Image.open(folder/'animation.gif')
  report['states'].append({'id':id,'svg':True,'webpFrames':w.n_frames,'gifFrames':gf.n_frames,'spriteSize':atlas.size,'allFramesInBounds':True})
  print(id,'exported',flush=True)
 for file in sorted((ROOT/'assets/static').glob('*.svg')):save_rasters(file)
 atlas=Image.new('RGBA',(512,512))
 for i,item in enumerate(json.loads((ROOT/'manifest.json').read_text())['gazes']):
  im=save_rasters(ROOT/item['svg']);atlas.paste(im.resize((128,128),Image.Resampling.LANCZOS),(i%4*128,i//4*128))
 atlas.save(ROOT/'assets/gaze/gaze-sprites.png');atlas.save(ROOT/'assets/gaze/gaze-sprites.webp',lossless=True)
 (ROOT/'tests/asset-results.json').write_text(json.dumps(report,indent=2)+'\n')
 print('All state assets and gazes exported',flush=True)

if __name__=='__main__':main()
