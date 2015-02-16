from slimit import minify
from jsmin import jsmin
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
f = open('everGis.cfg', 'r')
fileList = f.readlines()
f.close()

output = b''

import binascii

for fileName in fileList:
    f = open('../../Source/' + fileName[:-1], 'rb')
    file = f.read()

    if binascii.hexlify(file[0:3]) == b'efbbbf':
        file = file[3:]
        
    output += file
    f.close()

f = open('../Release/everGis.js', 'wb+')
f.write(output)
f.close()

f = open('../Release/everGis.js', 'r')
decoded = f.read()
f.close()

minified = jsmin(decoded)
f = open('../Release/everGis_min.js', 'w+')
f.write(minified)
f.close()

print('Completed!')
