const {User} = require('../models');
const AccessToken = require('./AccessToken');
const crud = require('./utils/crud');
const bcrypt = require('./utils/bcrypt');
const _ = require('lodash');
const errors = require('../utils/errors');

/**
 * Find a data by it's ID
 * @param {String} email
 * @param {Boolean} json
 * @return {Object|Model}
 */
async function fetchByEmail(email, json = true) {
    const item = await User.forge({email}).fetch();

    if (!_.isNil(item)) {
        return json ? item.toJSON() : item;
    }

    return undefined;
}

const crudMethods = crud(User);

module.exports = {
    ...crudMethods,
    async logout(token) {
        const exists = await AccessToken.exists({id: token});
        if (!exists) throw errors.logoutFailed();
        await AccessToken.destroyById(token);
    },
    async login(email, password) {
        const instance = await fetchByEmail(email, false);
        if (_.isNil(instance)) throw errors.notFound();
        const instanceJSON = instance.toJSON({visibility: false});

        const isValidPasssword = await bcrypt.compare(password, instanceJSON.password);
        if (!isValidPasssword) throw errors.loginFailed();

        return await AccessToken.create({
            userId: instanceJSON.id,
            ttl: 1209600, // 2 weeks
        });
    },
    async create(data) { // overwrite crud to hash password
        if (_.isObject(data) && _.isString(data.password)) {
            data.password = await bcrypt.hash(data.password);
        }

        return await crudMethods.create(data);
    },
    async updateById(id, data) {
        if (_.isObject(data) && _.isString(data.password)) {
            data.password = await bcrypt.hash(data.password);
        }

        return await crudMethods.updateById(id, data);
    },
};
