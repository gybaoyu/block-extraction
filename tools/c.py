from PIL import Image
im = Image.open('tools/v4_oak.png')
im.crop((150,40,700,300)).resize((1100,520), Image.NEAREST).save('tools/crop4.png')
