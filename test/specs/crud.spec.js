const db = require('../../src/db');
const Model = require('../../src/models/Menu');
const crud = require('../../src/controllers/crud')(Model);

const {expect} = require('chai');

describe('CRUD', () => {
    const testData = {
        name: 'test',
    };

    before(async () => {
        const {id} = await crud.create(testData);
        testData.id = id;
    });

    describe('count', () => {
        it('should count properly', async () => {
            const count = await crud.count();
            expect(count).to.be.finite;
            expect(count).to.be.above(0);
        });
    });

    describe('create', () => {
        const data = {
            name: 'testCreate',
        };

        it('should create properly', async () => {
            const res = await crud.create(data);
            data.id = res.id;
            expect(res).to.be.an('object');
            expect(res).to.deep.equal(data);
        });

        after(async () => {
            await crud.destroyById(data.id);
        });
    });

    describe('destroyById', () => {
        const data = {
            name: 'testDestroy',
        };

        before(async () => {
            const res = await crud.create(data);
            data.id = res.id;
        });

        it('should destroy properly', async () => {
            const res = await crud.destroyById(data.id);
            expect(res).to.be.an('undefined');
        });
    });

    describe('exists', () => {
        it('should exists', async () => {
            const res = await crud.exists(testData);
            expect(res).to.be.equal(true);
        });

        it('should not exists', async () => {
            const res = await crud.exists({});
            expect(res).to.be.equal(false);
        });
    });

    describe('fetchAll', () => {
        it('should return a non empty collection', async () => {
            const data = await crud.fetchAll();
            expect(data).to.be.an('array');
            expect(data).to.not.be.empty;
        });
    });

    describe('fetchById', () => {
        it('should fetch an item and return it', async () => {
            const item = await crud.fetchById(testData.id);
            expect(item).to.be.an('object');
            expect(item).to.have.property('id');
            expect(item.id).to.be.equal(testData.id);
        });

        it('should fetch a non existent item and return nil', async () => {
            const item = await crud.fetchById(500000);
            expect(item).to.be.an('undefined');
        });
    });

    describe('updateById', () => {
        it('should update a defined item', async () => {
            const updated = await crud.updateById(testData.id, {
                name: 'updatedName',
            });

            expect(updated).to.be.an('object');
            expect(updated).to.have.property('id');
            expect(updated.id).to.be.equal(testData.id);
            expect(updated).to.have.property('name');
            expect(updated.name).to.be.equal('updatedName');
        });

        it('should not update an undefined item', async () => {
            const updated = await crud.updateById(500000, {
                name: 'updatedName',
            });

            expect(updated).to.be.an('undefined');
        });
    });

    after(async () => {
        await crud.destroyById(testData.id);
        await db.knex.destroy();
    });
});