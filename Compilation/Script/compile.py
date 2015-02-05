from slimit import minify
"""
f = open('sGis.cfg', 'r')
fileList = f.readlines()
f.close()

output = ''

for fileName in fileList:
    f = open('../../Source/' + fileName[:-1], 'r')
    file = f.read()
    output += file
    f.close()

f = open('../Release/sGis.js', 'w+')
f.write(output)
f.close()


minified = minify(output)
f = open('../Release/sGis_min.js', 'w+')
f.write(minified)
f.close()
"""
f = open('everGis.cfg', 'r', encoding='utf-8-sig')
fileList = f.readlines()
f.close()

output = ''

for fileName in fileList:
    f = open('../../Source/' + fileName[:-1], 'r')
    file = f.read()
    output += file
    f.close()

f = open('../Release/everGis.js', 'w+')
f.write(output)
f.close()

#minified = minify(output)
#f = open('../Release/everGis_min.js', 'w+')
#f.write(minified)
#f.close()

print('Completed!')
