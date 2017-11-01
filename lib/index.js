const memoizee = require('memoizee')
const url = require('url')
const swagger = require('swagger-client')
const swaggerTools = require('swagger-tools').specs.v1
const utils = require('./utils')
const primitives = require('./primitives')

const primitive = (schema) => {
  schema = utils.objectify(schema)
  let { type, format } = schema

  let fn = primitives[`${type}_${format}`] || primitives[type]

  if (utils.isFunc(fn)) return fn(schema)

  return 'Unknown Type: ' + schema.type
}

const sampleFromSchema = (schema) => {
  let { type, properties, additionalProperties, items } = utils.objectify(schema)

  if (!type) {
    if (properties) {
      type = 'object'
    } else if (items) {
      type = 'array'
    } else {
      return
    }
  }

  if (type === 'object') {
    let props = utils.objectify(properties)
    let obj = {}
    for (var name in props) {
      obj[name] = sampleFromSchema(props[name])
    }

    if (additionalProperties === true) {
      obj.additionalProp1 = {}
    } else if (additionalProperties) {
      let additionalProps = utils.objectify(additionalProperties)
      let additionalPropVal = sampleFromSchema(additionalProps)

      for (let i = 1; i < 4; i++) {
        obj['additionalProp' + i] = additionalPropVal
      }
    }
    return obj
  }

  if (type === 'array') {
    return [sampleFromSchema(items)]
  }

  if (schema['enum']) {
    if (schema['default']) return schema['default']
    return utils.normalizeArray(schema['enum'])[0]
  }

  if (type === 'file') {
    return
  }

  return primitive(schema)
}

const memoizedSampleFromSchema = memoizee(sampleFromSchema)

const getSampleSchema = (schema) => {
  return JSON.stringify(memoizedSampleFromSchema(schema), null, 2)
}

const parser = module.exports = function (spec) {
  const newSpec = typeof (spec) === 'string' ? { url: spec } : { spec: spec }

  return swagger(newSpec).then((res) => {
    const spec = res.spec
    if (spec.swaggerVersion) { // v1
      const paths = spec.apis.map(api => {
        let baseUrl = res.url
        if (!/\.json$/.test(baseUrl)) {
          baseUrl += '/'
        }
        return swagger(url.resolve(baseUrl, api.path.replace(/^\//, '')))
      })
      return Promise.all(paths).then(apis => {
        const specs = apis.map(o => o.spec)
        return new Promise((resolve, reject) => {
          swaggerTools.convert(spec, specs, true, (error, docs) => {
            if (error) return reject(error)
            resolve(parser(docs))
          })
        })
      })
    } else {
      for (let path in spec.paths) {
        for (let method in spec.paths[path]) {
          const api = spec.paths[path][method]
          for (let code in api.responses) {
            const schema = utils.inferSchema(api.responses[code])
            api.responses[code].example = schema ? getSampleSchema(schema) : null
          }
          if (!api.parameters) continue
          for (let parameter of api.parameters) {
            const schema = utils.inferSchema(parameter)
            parameter.example = schema ? getSampleSchema(schema) : null
          }
        }
      }
    }
    return spec
  })
}
