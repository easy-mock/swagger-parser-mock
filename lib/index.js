var URL = require('url')
var memoizee = require('memoizee')
var swagger = require('swagger-client')
var swaggerTools = require('swagger-tools').specs.v1

var utils = require('./utils')
var primitives = require('./primitives')

function primitive (schema) {
  schema = utils.objectify(schema)

  var type = schema.type
  var format = schema.format
  var value = primitives[type + '_' + format] || primitives[type]

  return value || 'Unknown Type: ' + schema.type
}

function sampleFromSchema (schema) {
  schema = utils.objectify(schema)

  var type = schema.type
  var properties = schema.properties
  var additionalProperties = schema.additionalProperties
  var items = schema.items

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
    var props = utils.objectify(properties)
    var obj = {}
    for (var name in props) {
      obj[name] = sampleFromSchema(props[name])
    }

    if (additionalProperties === true) {
      obj.additionalProp1 = {}
    } else if (additionalProperties) {
      var additionalProps = utils.objectify(additionalProperties)
      var additionalPropVal = sampleFromSchema(additionalProps)

      for (var i = 1; i < 4; i++) {
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

var memoizedSampleFromSchema = memoizee(sampleFromSchema)

function getSampleSchema (schema) {
  return JSON.stringify(memoizedSampleFromSchema(schema), null, 2)
}

var parser = module.exports = function (url, opts) {
  opts = opts || {}

  if (typeof url === 'string') {
    opts.url = url
  } else {
    opts = url
  }

  return swagger(opts).then(function (res) {
    var spec = res.spec
    if (spec.swaggerVersion) { // v1
      var paths = spec.apis.map(function (api) {
        var baseUrl = res.url
        if (!/\.json$/.test(baseUrl)) {
          baseUrl += '/'
        }
        opts.url = URL.resolve(baseUrl, api.path.replace(/^\//, ''))
        return swagger(opts)
      })
      return Promise.all(paths).then(function (apis) {
        var specs = apis.map(function (o) { return o.spec })
        return new Promise(function (resolve, reject) {
          swaggerTools.convert(spec, specs, true, function (error, docs) {
            if (error) return reject(error)
            resolve(parser({ spec: docs }))
          })
        })
      })
    } else {
      for (var path in spec.paths) {
        for (var method in spec.paths[path]) {
          var api = spec.paths[path][method]
          var schema
          for (var code in api.responses) {
            schema = utils.inferSchema(api.responses[code])
            api.responses[code].example = schema ? getSampleSchema(schema) : null
          }
          if (!api.parameters) continue
          for (var parameter of api.parameters) {
            schema = utils.inferSchema(parameter)
            parameter.example = schema ? getSampleSchema(schema) : null
          }
        }
      }
    }
    return spec
  })
}
