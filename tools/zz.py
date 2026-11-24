from PIL import Image
im = Image.open('tools/z3.png')
im.crop((500,280,900,560)).resize((800,560), Image.NEAREST).save('tools/z3_crop.png')
