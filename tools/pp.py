from PIL import Image
im = Image.open('tools/p1.png')
im.crop((560,250,760,470)).resize((600,660), Image.NEAREST).save('tools/p1_crop.png')
