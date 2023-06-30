import { Router } from "express"
import { io } from "../app.js"
import { ProductManager } from "../data/managers/mongodb_managers/product.manager.js"
import { CustomError } from "../utils/CustomError.js"

export const realtimeProductsController = Router()

const productManager = new ProductManager()

realtimeProductsController.get("/", async (req, res, next) => {
    try{
        const response = await productManager.getProducts()

        res.status(response.status).render("home.handlebars", { products: response.response.length && response.response, style: "home.css", title: "Products | Home" })
    }catch(error){
        console.log(error)
        next(error)
    }
})

realtimeProductsController.get("/new_product", async (req, res, next) => {
    try{
        const response = await productManager.getProducts()
        
        res.status(200).render("newProduct.handlebars", { products: response.response.length ? response.response : false, style: "realtime-products.css", title: "Products | Realtime" })
    }catch(error){
        console.log(error)
        next(error)
    }
})

realtimeProductsController.post("/new_product", async (req, res, next) => {
    const { title, description, category, price, code, status=true, stock, thumbnails } = req.body
    const product = { title, description, category, price, code, status, stock, thumbnails }

    try{
        const products = await productManager.getProducts()
        
        if(!products.response.length){
            const response = await productManager.createProduct(product)
            
            io.emit("new-product", product)

            return res.status(response.status).json(response)
        }

        const isRepeated = products.response.find(x => x.code === code)
        
        if(isRepeated) throw new CustomError({ status: 400, ok: false, response: "This product code already exists." })
        
        const response = await productManager.createProduct(product)
        const updatedProducts = await productManager.getProducts()

        io.emit("new-product", updatedProducts.response)

        res.status(response.status).json(response)
    }catch(error){
        next(error)
    }
})

realtimeProductsController.delete("/:id", async (req, res, next) => {
    const { id } = req.params
    
    try{
        const response = await productManager.deleteProduct(id)
        const products = await productManager.getProducts()

        response.ok && io.emit("product-deleted", products.response)
        
        res.status(response.status).json(response)
    }catch(error){
        next(error)
    }
})