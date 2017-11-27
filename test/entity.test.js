const path = require('path')
const StaticServer = require('static-server')
const swaggerParserMock = require('../lib')
const {
  getJavaScriptEntities,
  getObjectiveCEntities
} = require('../lib/entity')

const server = new StaticServer({
  rootPath: path.join(__dirname, 'specs'),
  port: 3333
})

describe('entity.test.js', () => {
  let spec
  let specV1
  let getRes
  let getAPI

  beforeAll(() => {
    server.start()
    spec = swaggerParserMock('http://localhost:3333/v2/petstore.yml')
    specV1 = swaggerParserMock('http://localhost:3333/v1.2/api-docs.json')
    getRes = (api) => (api.responses['200'] || api.responses['default'])
    getAPI = (url, method, docs = spec) => {
      return docs.then(res => {
        for (let _url in res.paths) {
          if (url === _url) {
            for (let _method in res.paths[_url]) {
              if (method === _method) {
                return res.paths[url][method]
              }
            }
          }
        }
      })
    }
  })

  afterAll(() => {
    server.stop()
  })

  test('getJavaScriptEntities', done => {
    const entity = {
      pet: 'class Pet {constructor() {this.id = 0;this.category = Category;this.name = \'\';this.photoUrls = [\'\'];this.tags = [Tag];this.status = \'\';}}',
      category: 'class Category {constructor() {this.id = 0;this.name = \'\';}}',
      tag: 'class Tag {constructor() {this.id = 0;this.name = \'\';}}'
    }
    getAPI('/pet/findByTags', 'get')
      .then(api => {
        const res = getRes(api)
        const entities = getJavaScriptEntities(res)
        expect(entities[0]).toBe(entity.pet)
        expect(entities[1]).toBe(entity.category)
        expect(entities[2]).toBe(entity.tag)
        return getAPI('/pet/findByTags', 'get', specV1)
      })
      .then(api => {
        const res = getRes(api)
        const entities = getJavaScriptEntities(res)
        expect(entities[0]).toBe(entity.pet)
        expect(entities[1]).toBe(entity.category)
        expect(entities[2]).toBe(entity.tag)
        done()
      })
  })

  test('getObjectiveCEntities', done => {
    const entity = {
      pet: '@interface Pet : NSObject\n\n@property (nonatomic, strong) NSNumber *id;\n@property (nonatomic, copy) NSString *category;\n@property (nonatomic, copy) NSString *name;\n@property (nonatomic, copy) NSArray *photoUrls;\n@property (nonatomic, copy) NSArray *tags;\n@property (nonatomic, copy) NSString *status;\n\n@end',
      category: '@interface Category : NSObject\n\n@property (nonatomic, strong) NSNumber *id;\n@property (nonatomic, copy) NSString *name;\n\n@end',
      tag: '@interface Tag : NSObject\n\n@property (nonatomic, strong) NSNumber *id;\n@property (nonatomic, copy) NSString *name;\n\n@end'
    }
    getAPI('/pet/findByTags', 'get').then(api => {
      const res = getRes(api)
      const entities = getObjectiveCEntities(res)
      expect(entities[0]).toBe(entity.pet)
      expect(entities[1]).toBe(entity.category)
      expect(entities[2]).toBe(entity.tag)
      done()
    })
  })
})
