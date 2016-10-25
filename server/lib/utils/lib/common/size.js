//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

module.exports = function (width, height) {
    var size = {
        width: width,
        height: height,
        toString: function () {
            return this.width + "x" + this.height;
        },
        toObject: function () {
            return {
                width: this.width,
                height: this.height
            };
        }
    };

    return size;
};

