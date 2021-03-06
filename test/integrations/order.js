const _ = require('lodash');
const {expect} = require('chai');
const config = require('../../src/config');
const OrderCRUD = require('../../src/controllers/Order');
const UserCRUD = require('../../src/controllers/User');
const MenuCRUD = require('../../src/controllers/Menu');
const ProductCRUD = require('../../src/controllers/Product');
const PromotionCRUD = require('../../src/controllers/Promotion');

const {api, buildUrl, uuid, login} = require('../utils');

const createOrder = async (userId, productIds = [], menuIds = []) => {
    const order = await OrderCRUD.create({
        //price: 50,
        userId,
    });

    return order.id;
};

const createUser = async (email, password) => {
    const user = await UserCRUD.create({
        email: email || uuid() + '@qsdqsdqd.fr',
        password: password || uuid(),
    });

    return user.id;
};

const createMenu = async (productIds = [], promotionIds = []) => {
    const menu = await MenuCRUD.create({
        name: uuid(),
        productIds,
        promotionIds,
    });

    return menu.id;
};

const createProduct = async (promotionIds = []) => {
    const product = await ProductCRUD.create({
        name: uuid(),
        price: 10,
        promotionIds,
    });

    return product.id;
};

const createPromotions = async () => {
    const promotion = await PromotionCRUD.create({
        value: 42,
        name: uuid(),
    });

    return promotion.id;
};

// TODO : ACL
let adminToken;
let userId;
let userToken;

describe('Order Integrations', () => {
    before((done) => {
        api.post(buildUrl('/users/login'))
            .send(config.admin)
            .end((err, res) => {
                if (err) return done(err);
                adminToken = res.body.id;

                const email = uuid() + '@' + uuid() + '.fr';
                const password = uuid();

                api.post(buildUrl('/users'))
                    .send({
                        email,
                        password,
                    })
                    .end((err, res) => {
                        if (err) return done(err);
                        userId = res.body.id;
                        api.post(buildUrl('/users/login'))
                            .send({
                                email,
                                password,
                            })
                            .end((err, res) => {
                                if (err) return done(err);
                                userToken = res.body.id;
                                done();
                            });
                    });
            });
    });

    after((done) => {
        api.post(buildUrl('/users/logout'))
            .auth(adminToken, {type: 'bearer'})
            .end((err) => {
                if (err) return done(err);
                done();
            });
    });

    describe('Find', () => {
        let orderId;

        before(async () => {
            orderId = await createOrder();
        });

        it('should find data', (done) => {
            api.get(buildUrl('/orders'))
                .auth(adminToken, {type: 'bearer'})
                .expect('Content-Type', /json/)
                .expect(200)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body).to.be.an('array');
                    expect(res.body).to.not.be.empty;
                    expect(res.body).to.satisfy((arr) => !_.isNil(arr.find((m) => m.id === orderId)));
                    done();
                });
        });

        after(async () => {
            if (orderId) await OrderCRUD.destroyById(orderId);
        });
    });

    describe('Find by ID', () => {
        let orderId;

        before(async () => {
            orderId = await createOrder(userId);
        });

        it('should find data by id', (done) => {
            api.get(buildUrl('/orders/' + orderId))
                .auth(userToken, {type: 'bearer'})
                .expect('Content-Type', /json/)
                .expect(200)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body).to.be.an('object');
                    done();
                });
        });

        it('should get 401', (done) => {
            api.get(buildUrl('/orders/100000'))
                .expect(401, done);
        });

        after(async () => {
            if (orderId) await OrderCRUD.destroyById(orderId);
        });
    });

    describe('Create', () => {
        let orderId;
        let productId;
        let menuId;
        let promotionId;

        before(async () => {
            promotionId = await createPromotions();
            productId = await createProduct([promotionId]);
            menuId = await createMenu([productId], [promotionId]);
        });

        it('should create an instance', (done) => {
            api.post(buildUrl('/orders'))
                .auth(adminToken, {type: 'bearer'})
                .expect(201)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('id');
                    expect(res.body.price).to.be.equal(0);
                    orderId = res.body.id;
                    done();
                });
        });

        it('should create a order with menu, product and promotion', (done) => {
            api.post(buildUrl('/orders'))
                .send({
                    productIds: [productId],
                    menuIds: [menuId],
                })
                .auth(adminToken, {type: 'bearer'})
                .expect(201)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body).to.be.an('object');
                    const price = 10 * 0.58 + 10 * 0.58 * 0.58;
                    expect(res.body.price).to.be.closeTo(price, 0.001);
                    orderId = res.body.id;
                    done();
                });
        });

        after(async () => {
            if (orderId) await OrderCRUD.destroyById(orderId);
        });
    });

    describe('Update properties', () => {
        const data = {
            price: 50,
        };

        before(async () => {
            const {id} = await OrderCRUD.create(data);
            data.id = id;
        });

        it('should update an instance', (done) => {
            api.patch(buildUrl('/orders/' + data.id))
                .auth(adminToken, {type: 'bearer'})
                .expect(200)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('id');
                    expect(res.body.price).to.be.equal(0);
                    done();
                });
        });

        after(async () => {
            if (data.id) await OrderCRUD.destroyById(data.id);
        });
    });

    describe('Update', () => {
        describe('Update properties', () => {
            const data = {
                price: 60,
            };

            before(async () => {
                const {id} = await OrderCRUD.create(data);
                data.id = id;
            });

            it('should update an instance', (done) => {
                api.put(buildUrl('/orders/' + data.id))
                    .auth(adminToken, {type: 'bearer'})
                    .expect(200)
                    .end((err, res) => {
                        if (err) return done(err);
                        expect(res.body).to.be.an('object');
                        expect(res.body).to.have.property('id');
                        expect(res.body.price).to.be.equal(0);
                        done();
                    });
            });

            after(async () => {
                if (data.id) await OrderCRUD.destroyById(data.id);
            });
        });
    });

    describe('Delete', () => {
        const data = {
            price: 50,
        };
        let otherUser;

        before(async () => {
            const {id} = await OrderCRUD.create(data);
            data.id = id;
        });

        before(async () => {
            const credentials = {
                password: uuid(),
                email: uuid() + '@test.fr',
            };
            await createUser(credentials.email, credentials.password);
            otherUser = await login(credentials);
        });

        it('should not delete', (done) => {
            api.delete(buildUrl('/orders/' + data.id))
                .auth(otherUser, {type: 'bearer'})
                .expect(401, done);
        });

        it('should delete', (done) => {
            api.delete(buildUrl('/orders/' + data.id))
                .auth(adminToken, {type: 'bearer'})
                .expect(204, done);
        });

        it('should not delete and return 404', (done) => {
            api.delete(buildUrl('/orders/200000'))
                .auth(adminToken, {type: 'bearer'})
                .expect(404, done);
        });

        after(async () => {
            if (data.id) await OrderCRUD.destroyById(data.id);
        });
    });

    describe('Exists', () => {
        const data = {
            price: 50,
        };

        before(async () => {
            const {id} = await OrderCRUD.create(data);
            data.id = id;
        });

        it('should exists', (done) => {
            api.head(buildUrl('/orders/' + data.id))
                .auth(adminToken, {type: 'bearer'})
                .expect(200, done);
        });

        it('should not exists', (done) => {
            api.head(buildUrl('/orders/500000'))
                .expect(401, done);
        });

        after(async () => {
            if (data.id) await OrderCRUD.destroyById(data.id);
        });
    });

    describe('Count', () => {
        it('should return a counter', (done) => {
            api.get(buildUrl('/orders/count'))
                .auth(adminToken, {type: 'bearer'})
                .expect(200)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body).to.be.an('object');
                    expect(res.body.count).to.be.finite;
                    expect(res.body.count).to.be.above(-1);
                    done();
                });
        });
    });
});
