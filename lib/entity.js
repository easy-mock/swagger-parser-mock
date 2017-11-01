const utils = require('./utils')

function flatSchema (schema, models) {
  let { type, properties, additionalProperties, items, $$ref } = utils.objectify(schema)

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
    const props = utils.objectify(properties)

    for (var name in props) {
      flatSchema(props[name], models)
    }

    if (additionalProperties && additionalProperties !== true) {
      let additionalProps = utils.objectify(additionalProperties)
      flatSchema(additionalProps, models)
    }
  }

  if (type === 'array') {
    flatSchema(items, models)
  }
}

function getClassName (schema) {
  const ref = schema.$$ref
  return ref ? ref.replace(/#\/definitions\//, '') : 'Demo'
}

const getValueByJS = (prop) => {
  let { type, properties, items } = prop

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
      return `[${getValueByJS(items)}]`
    case 'boolean':
      return false
    case 'object':
      return getClassName(prop)
    default:
      return '\'\''
  }
}

const getValueByOC = (key, prop) => {
  let value
  switch (prop.type) {
    case 'integer':
    case 'number':
      value = `@property (nonatomic, strong) NSNumber *${key};`
      break
    case 'array':
      value = `@property (nonatomic, copy) NSArray *${key};`
      break
    case 'boolean':
      value = `@property (nonatomic, assign) BOOL ${key};`
      break
    default:
      value = `@property (nonatomic, copy) NSString *${key};`
      break
  }
  return value + '\n'
}

function getEntities (docs, type) {
  const models = []
  const schema = utils.inferSchema(docs)

  if (schema) {
    flatSchema(schema, models)
  }

  return models.map(model => {
    const properties = model.properties
    const props = []

    if (type === 'js') {
      for (let propName in properties) {
        props.push(`this.${propName} = ${getValueByJS(properties[propName])};`)
      }
      return `class ${getClassName(model)} {constructor() {${props.join('')}}}`
    }

    for (let propName in properties) {
      props.push(getValueByOC(propName, properties[propName]))
    }
    return `@interface ${getClassName(model)} : NSObject\n\n${props.join('')}\n@end`
  })
}

module.exports = {
  getJavaScriptEntities: (docs) => getEntities(docs, 'js'),
  getObjectiveCEntities: (docs) => getEntities(docs, 'oc')
}
