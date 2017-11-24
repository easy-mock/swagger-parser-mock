const swaggerParserMock = require('../lib')

const spec = {
  petStore: {
    docs: swaggerParserMock({ spec: require('./specs/v3/petstore.json') }),
    schema: {
      pet: { id: '@integer(60, 100)', name: '@string', tag: '@string' },
      error: { code: '@integer(60, 100)', message: '@string' }
    }
  }
}

describe('v3.test.js', () => {
  let getAPI
  let getMock

  beforeAll(() => {
    getMock = (api) => {
      const res = api.responses['200'] || api.responses['default']
      if (!res) return
      return res.example && JSON.parse(res.example)
    }
    getAPI = (url, method) => {
      return spec.petStore.docs.then(res => {
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

  describe('petstore', () => {
    test('/pets', done => {
      getAPI('/pets', 'get')
        .then(res => {
          const mock = getMock(res)
          expect(mock).toHaveLength(1)
          expect(mock[0]).toEqual(spec.petStore.schema.pet)
        })
        .then(() => getAPI('/pets', 'post'))
        .then(res => {
          const mock = getMock(res)
          expect(mock).toEqual(spec.petStore.schema.error)
          done()
        })
    })
  })
})
