const fs = require('fs')  // 获得主入口文件
const path = require('path')
const babel = require('@babel/core')
const parser = require('@babel/parser') // 解析ast语法树
const traverse  = require('@babel/traverse').default  // 循环
const getModuleInfo = (file) => {
    const body = fs.readFileSync(file,'utf-8')
    const ast = parser.parse(body,{
        sourceType:'module'
    })
    const deps = {}
    traverse(ast,{
        // 函数名大小写文档
        ImportDeclaration({node}){
            const dirname = path.dirname(file)
            const abspath = './' + path.join(dirname,node.source.value)
            deps[node.source.value] = abspath
        }
    })
    // console.log(deps)
    const {code} = babel.transformFromAst(ast,null,{
       presets:['@babel/preset-env']
    })
    const moduleInfo = {file,deps,code}
    return moduleInfo
}
const parseModules = (file) => {
    const entry = getModuleInfo(file)
    const temp = [entry]
    const depsGraph = {}
    for(let i = 0;i<temp.length;i++) {
        const deps = temp[i].deps
        if(deps) {
            for(const key in deps) {
                if(deps.hasOwnProperty(key)) {
                    temp.push(getModuleInfo(deps[key]))
                }
            }
        }
    }
    // console.log(temp)
    temp.forEach(moduleInfo => {
        depsGraph[moduleInfo.file] ={
            deps:moduleInfo.deps,
            code:moduleInfo.code
        }
    })
    return depsGraph
}
const bundle = (file) => {
    const depsGraph = JSON.stringify(parseModules(file))
    console.log(depsGraph)
    return `(function (graph){
        function require(file) {
            function absRequire(relPath) {
                return require(graph[file].deps[relPath])
            }
            var exports = {};
            (function (require,exports,code) {
                eval(code)
            })(absRequire,exports,graph[file].code)
            return exports
        }
        require('${file}')
    })(${depsGraph})`
}
const content = bundle('./src/index.js')
fs.mkdirSync('./dist');
fs.writeFileSync('./dist/bundle.js',content)
// console.log(content)