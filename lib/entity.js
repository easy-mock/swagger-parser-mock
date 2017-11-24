var utils = require('./utils')

function flatSchema (schema, models) {
  schema = utils.objectify(schema)

  var type = schema.type
  var properties = schema.properties
  var additionalProperties = schema.additionalProperties
  var items = schema.items
  var $$ref = schema.$$ref

  if (!type) {
    if (properties) {
      type = 'object'
    } else if (items) {
      type = 'array'
    } else {
      return
    }
  }

  if ($$ref) {
    models.push(schema)
  }

  if (type === 'object') {
    var props = utils.objectify(properties)

    for (var name in props) {
      flatSchema(props[name], models)
    }

    if (additionalProperties && additionalProperties !== true) {
      var additionalProps = utils.objectify(additionalProperties)
      flatSchema(additionalProps, models)
    }
  }

  if (type === 'array') {
    flatSchema(items, models)
  }
}

function getClassName (schema) {
  var ref = schema.$$ref
  return ref ? ref.replace(/.*\//g, '') : 'Demo'
}

function getValueByJS (prop) {
  var type = prop.type
  var properties = prop.properties
  var items = prop.items

  if (!type) {
    if (properties) {
      type = 'object'
    } else if (items) {
      type = 'array'
    }
  }

  switch (type) {
    case 'integer':
    case 'number':
      return 0
    case 'array':
      return '[' + getValueByJS(items) + ']'
    case 'boolean':
      return false
    case 'object':
      return getClassName(prop)
    default:
      return '\'\''
  }
}

function getValueByOC (key, prop) {
  var value
  switch (prop.type) {
    case 'integer':
    case 'number':
      value = '@property (nonatomic, strong) NSNumber *' + key + ';'
      break
    case 'array':
      value = '@property (nonatomic, copy) NSArray *' + key + ';'
      break
    case 'boolean':
      value = '@property (nonatomic, assign) BOOL ' + key + ';'
      break
    default:
      value = '@property (nonatomic, copy) NSString *' + key + ';'
      break
  }
  return value + '\n'
}

function getEntities (docs, type) {
  docs = (docs.content && docs.content['application/json']) || docs

  var models = []
  var schema = utils.inferSchema(docs)

  if (schema) {
    flatSchema(schema, models)
  }

  return models.map(function (model) {
    var properties = model.properties
    var props = []
    var propName

    if (type === 'js') {
      for (propName in properties) {
        props.push('this.' + propName + ' = ' + getValueByJS(properties[propName]) + ';')
      }
      return 'class ' + getClassName(model) + ' {constructor() {' + props.join('') + '}}'
    }

    for (propName in properties) {
      props.push(getValueByOC(propName, properties[propName]))
    }
    return '@interface ' + getClassName(model) + ' : NSObject\n\n' + props.join('') + '\n@end'
  })
}

module.exports = {
  getJavaScriptEntities: function (docs) {
    return getEntities(docs, 'js')
  },
  getObjectiveCEntities: function (docs) {
    return getEntities(docs, 'oc')
  }
}
