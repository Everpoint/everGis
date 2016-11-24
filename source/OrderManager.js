/**
 * Created by tporyadin on 9/1/2016.
 */
sGis.module('spatialProcessor.OrderManager', [], function () {

    /**
     * Class for managing order of async loaded objects array
     * @alias sGis.spatialProcessor.OrderManager
     */
    class OrderManager {
        /**
         * @constructor
         * @param {Array} [ids=[]] - ordered array of unique ids.
         */
        constructor(ids = []) {
            this._ids = ids;
            this._currIds = [];
        }

        /**
         * Order list of ids
         * @returns {Array}
         */
        get ids() {
            return this._ids;
        }

        /**
         * Order list of  loaded ids
         * @returns {Array}
         */
        get currIds() {
            return this._currIds;
        }

        /**
         * Return index of object
         * @param id - unique id of object
         * @returns {number} objects index
         */
        getIndex(id) {
            const index = this._ids.indexOf(id);
            return index < 0 ? (this._ids.push(id) - 1) : index;
        }

        /**
         * Return current index of object
         * @param index
         * @param id
         * @returns {number} current objects index
         */
        getCurrentIndex(index, id) {
            this._currIds[index] = id;
            return this._currIds.filter(id => !!id).indexOf(id);
        }

        /**
         * Move id in ids array
         * @param id id
         * @param direction direction
         * @returns {number} new ids index
         */
        moveId(id, direction) {
            const {ids, currIds} = this;
            let from = this.ids.indexOf(id);
            let to = from + direction;

            if (to < 0 || to >= ids.length) {
                return from;
            }

            this._ids = sGis.utils.arrayMove(ids, from, to);
            this._currIds = sGis.utils.arrayMove(currIds, from, to);

            return to;
        }

        /**
         * Remove id from ids array
         * @param id id
         * @returns {number} index of removed id
         */
        removeId(id) {
            const {ids, currIds} = this;
            const index = ids.indexOf(id);

            this._ids = [...ids.slice(0, index), ...ids.slice(index + 1)];
            this._currIds = [...currIds.slice(0, index), ...currIds.slice(index + 1)];

            return index;
        }

    }

    return OrderManager
});