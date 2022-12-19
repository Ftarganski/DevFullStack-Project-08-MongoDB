import AdminJS from 'adminjs'
import AdminJSExpress from '@adminjs/express'
import AdminSequelize from '@adminjs/sequelize'
import AdminMongoose from '@adminjs/mongoose'
import express from 'express';

// IMPORT MODELS
import { Role } from './models/role.entity';
import { User } from './models/user.entity';
import { Document } from './models/document.entity';
import UserController from './controllers/UserController';
import session from 'express-session';

require('dotenv').config()

const bcrypt = require("bcryptjs");
const mysqlStore = require("express-mysql-session")(session);
const { PORT } = process.env
const sessionStore = new mysqlStore({
  connectionLimit: 10,
  password: process.env.SQL_DB_PASS,
  user: process.env.SQL_DB_USER,
  database: process.env.SQL_DB_NAME,
  host: process.env.SQL_DB_HOST,
  port: process.env.SQL_DB_PORT,
  createDatabaseTable: true
})

AdminJS.registerAdapter({
  Resource: AdminSequelize.Resource,
  Database: AdminSequelize.Database,
})

AdminJS.registerAdapter({
  Resource: AdminMongoose.Resource,
  Database: AdminMongoose.Database,
})

const generateResource = (Model: object, properties: any = {}, actions: any = {}) => {
  return {
    resource: Model,
    options: {
      properties: {
        ...properties,
        createdAt: {
          isVisible: { list: true, edit: false, create: false, show: true }
        },
        updatedAt: {
          isVisible: { list: true, edit: false, create: false, show: true }
        }
      },
      ...actions,
    }

  }
}

const start = async () => {
  const app = express()

  const adminOptions = {
    resources: [
      generateResource(Role),
      generateResource(User,
        {
          id: {
            isVisible: { list: false, edit: false }
          },
          email: {
            isVisible: { list: false, edit: false }
          },
          username: {
            isVisible: { list: false, edit: false }
          },
          password: {
            type: 'password'
          }
        },
        {
          new: {
            before: async (request: any, context: any) => {
              if (request.paylod.password) {
                request.payload.password = await bcrypt.hashSync(request.payload.password, 10);
              }
              return request;
            },
            after: async (request: any, context: any, originalResponse: any) => {
              return originalResponse;
            }
          }
        }
      ),
      generateResource(Document)
    ],
    dashboard: {
      component: AdminJS.bundle('./components/DashboardComponent')
    },
    // rootPath: '/dash/admin',
    branding: {
      companyName: '.DOCs',
      logo: 'https://images2.imgbox.com/71/39/KmVQExIZ_o.png',
      favicon: 'https://images2.imgbox.com/bb/22/oHCQLE3V_o.png'
    }
  }

  const admin = new AdminJS(adminOptions)

  // const adminRouter = AdminJSExpress.buildRouter(admin)

  const adminRouter = AdminJSExpress.buildAuthenticatedRouter(admin,
    {
      authenticate: async (email, password) => {
        const userCtrl = new UserController
        return await userCtrl.login(email, password);
      },
      cookieName: 'adminjs-dash-admin',
      cookiePassword: '12345678',
    },
    null,
    {
      store: sessionStore,
      resave: true,
      saveUninitialized: true,
      secret: '6QFn*][i9JK+)pPSb2C{q<SlCA(aJkG|f_zW3E0EGs{121{.I#HP<%OeeD[~rsV',
      cookie: {
        httpOnly: process.env.NODE_ENV !== 'production',
        secure: process.env.NODE_ENV === 'production'
      },
      name: 'adminjs-dash-admin',

    })
  app.use(admin.options.rootPath, adminRouter)

  app.get('/', (req, res) => {
    res.send('=== SYSTEM OK ===')
  })

  app.listen(PORT, () => {
    console.log(`AdminJS started on http://localhost:${PORT}`)
  })
}

start()