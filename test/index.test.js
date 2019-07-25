const path = require('path')
const StaticServer = require('static-server')
const swaggerParserMock = require('../lib')

const server = new StaticServer({
  rootPath: path.join(__dirname, 'specs'),
  port: 3334
})

describe('index.test.js', () => {
  let specs
  let getAPI
  let getMock

  const petSchema = {
    id: '@integer(60, 100)',
    category: {
      id: '@integer(60, 100)',
      name: '@string'
    },
    name: expect.any(String),
    photoUrls: ['@string'],
    tags: [{
      id: '@integer(60, 100)',
      name: '@string'
    }],
    status: '@pick(["available","pending","sold"])'
  }

  const orderSchema = {
    complete: '@boolean',
    id: '@integer(60, 100)',
    petId: '@integer(60, 100)',
    quantity: '@integer(60, 100)',
    shipDate: '@datetime',
    status: '@pick(["placed","approved","delivered"])'
  }

  const userSchema = {
    email: '@string',
    firstName: '@string',
    id: '@integer(60, 100)',
    lastName: '@string',
    password: '@string',
    phone: '@string',
    userStatus: '@integer(60, 100)',
    username: '@string'
  }

  beforeAll(() => {
    getMock = (api) => {
      const res = api.responses['200'] || api.responses['default']
      if (!res) return
      return res.example && JSON.parse(res.example)
    }
    getAPI = (url, method) => {
      return specs.then(result => {
        const apis = []
        result.forEach(res => {
          for (let _url in res.paths) {
            if (url === _url) {
              for (let _method in res.paths[_url]) {
                if (method === _method) {
                  apis.push(res.paths[url][method])
                  return
                }
              }
            }
          }
        })
        return apis
      })
    }
    return new Promise((resolve) => {
      server.start(() => {
        specs = Promise.all([
          swaggerParserMock('http://localhost:3334/v1.2/api-docs.json'),
          swaggerParserMock('http://localhost:3334/v2/petstore.yml')
        ])
        resolve()
      })
    })
  })

  afterAll(() => {
    server.stop()
  })

  describe('v1.2 & v2', () => {
    test('/pet/findByStatus', done => {
      getAPI('/pet/findByStatus', 'get').then(result => {
        result.forEach((res, index) => {
          const mock = getMock(res)
          expect(mock).toHaveLength(1)
          expect(mock[0]).toEqual(petSchema)
          if (index === 0) expect(mock[0].name).toEqual('@string')
          if (index === 1) expect(mock[0].name).toEqual('doggie')
        })
        done()
      })
    })

    test('/pet/{petId}', done => {
      getAPI('/pet/{petId}', 'get').then(result => {
        result.forEach((res, index) => {
          const mock = getMock(res)
          expect(mock).toEqual(petSchema)
          if (index === 0) expect(mock.name).toEqual('@string')
          if (index === 1) expect(mock.name).toEqual('doggie')
        })
        done()
      })
    })

    test('/pet/{petId}/uploadImage', done => {
      getAPI('/pet/{petId}/uploadImage', 'post').then(result => {
        result.forEach(res => {
          const mock = getMock(res)
          expect(mock).toEqual({
            code: '@integer(60, 100)',
            message: '@string',
            type: '@string'
          })
        })
        done()
      })
    })

    test('/store/inventory', done => {
      getAPI('/store/inventory', 'get').then(result => {
        result.forEach(res => {
          const mock = getMock(res)
          expect(mock).toEqual({
            additionalProp1: '@integer(60, 100)',
            additionalProp2: '@integer(60, 100)',
            additionalProp3: '@integer(60, 100)'
          })
        })
        done()
      })
    })

    test('/store/order', done => {
      getAPI('/store/order', 'post').then(result => {
        result.forEach(res => {
          const mock = getMock(res)
          expect(mock).toEqual(orderSchema)
        })
        done()
      })
    })

    test('/user', done => {
      getAPI('/user', 'post').then(result => {
        result.forEach(res => {
          const mock = getMock(res)
          expect(mock).toBeUndefined()
        })
        done()
      })
    })

    test('/user/login', done => {
      getAPI('/user/login', 'get').then(result => {
        result.forEach(res => {
          const mock = getMock(res)
          expect(mock).toBe('@string')
        })
        done()
      })
    })

    test('/user/{username}', done => {
      getAPI('/user/{username}', 'get').then(result => {
        result.forEach(res => {
          const mock = getMock(res)
          expect(mock).toEqual(userSchema)
        })
        done()
      })
    })
  })
})
