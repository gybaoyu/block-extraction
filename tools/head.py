from PIL import Image
im = Image.open('assets/tex/mob_player.png').convert('RGBA')
w,h = im.size
bbox = im.getbbox()
print('size', (w,h), 'bbox', bbox)
# 头部：整体 bbox 顶部 25% 高度，水平居中
bx0,by0,bx1,by1 = bbox
hh = by1-by0
head_h = int(hh*0.27)
cx = (bx0+bx1)//2
head_w = int(head_h*0.86)
box = (cx-head_w//2, by0, cx+head_w//2, by0+head_h)
print('crop', box)
head = im.crop(box).resize((16,16), Image.LANCZOS)
head.save('tools/head_test.png')
# 预览：32x32
head.resize((128,128), Image.NEAREST).save('tools/head_preview.png')
