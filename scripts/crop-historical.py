"""Render only each historical question, retaining cross-page figures."""
import fitz, json, re
from PIL import Image, ImageChops
from pathlib import Path
files={21:'2021-2022-past-exams',22:'2021-2022-past-exams',23:'2023-past-exam',24:'2024-memory-review'}
docs={y:fitz.open('course/resources/'+f+'.pdf') for y,f in files.items()}
starts={}
for year,d in docs.items():
 for pi,p in enumerate(d):
  if year==21 and pi>2 or year==22 and pi<3:continue
  for b in p.get_text('blocks'):
   m=re.match(r'^(\d{1,2})\.\s',b[4])
   if m and b[0]<100:starts[(year,int(m[1]))]=(pi,b[1])
manifest={}
for q in json.load(open('scripts/historical-questions.json')):
 y,n=q['year'],q['number'];d=docs[y];pi,top=starts[y,n]
 end=starts.get((y,n+1),(pi,780))
 if y==22 and n==9:end=starts[y,10]
 parts=[];rects=[]
 for page in range(pi,end[0]+1):
  lo=top-4 if page==pi else 65
  hi=end[1]-5 if page==end[0] else 780
  clip=fitz.Rect(62 if y<23 else 82,lo,535,hi)
  pix=d[page].get_pixmap(matrix=fitz.Matrix(2,2),clip=clip,colorspace=fitz.csGRAY)
  im=Image.frombytes('L',(pix.width,pix.height),pix.samples)
  # Remove page whitespace only, leaving every non-white original mark intact.
  mask=im.point(lambda p:255 if p<245 else 0);bbox=mask.getbbox()
  if bbox:
   im=im.crop((0,max(0,bbox[1]-6),im.width,min(im.height,bbox[3]+6)));parts.append(im)
  rects.append({'page':page+1,'rect':list(clip)})
 out=Image.new('L',(max(p.width for p in parts),sum(p.height for p in parts)+16*(len(parts)-1)),255);offset=0
 for im in parts:out.paste(im,(0,offset));offset+=im.height+16
 path='course/exam-originals/historical-'+q['key']+'.png';out.save(path,optimize=True)
 manifest[q['key']]={'image':'/'+path.removeprefix('course/'),'regions':rects}
Path('scripts/historical-crops.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Cropped',len(manifest),'historical question sources')
