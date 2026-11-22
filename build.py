import glob,os
d=os.path.dirname(os.path.abspath(__file__))
js='\n'.join(open(f).read() for f in sorted(glob.glob(d+'/src/[0-9]*.js')))
shell=open(d+'/src/shell.html').read()
open(d+'/index.html','w').write(shell.replace('/*__SCRIPT__*/',js))
open(d+'/all.js','w').write('{\n'+js+'\n}')
print(len(js))
