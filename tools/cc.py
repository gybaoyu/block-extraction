from PIL import Image
im = Image.open('tools/iso3_start.png')
im.crop((480,240,820,520)).resize((680,560), Image.NEAREST).save('tools/iso3_crop.png')
