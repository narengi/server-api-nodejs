/**
 * @author Aref Mirhosseini <code@arefmirhosseini.com> (http://arefmirhosseini.com)
 */

const debug = require('debug')('narengi-commonlibs-prices')

module.exports = function (price) {
    let formatted_price = 0;
    let formatted_label = 'هزار تومان';
    let price_range = 0;

    // convert price value type to number
    if ( typeof price !== 'number' ) {
        price = Number(price) || 0;
    }

    if (price > 0) {

        // Check price range
        switch (true) {
            case parseInt(price / 1000000) > 0:
                formatted_price = Number(price / 1000000).toFixed(1);
                formatted_label = 'میلیون تومان';
            break;
            case parseInt(price / 1000) > 0:
                formatted_price = Number(price / 1000).toFixed(1);
                formatted_label = 'هزار تومان';
            break;
            default:
                formatted_price = Number(price);
                formatted_label = 'تومان';
        }

        if (formatted_price - parseInt(formatted_price) === 0) {
            formatted_price = parseInt(formatted_price);
        }
        
    }

    // change formatted_label to FREE if price was 0
    if (formatted_price === 0) {
        formatted_price = '';
        formatted_label = 'رایگان';
    }

    return `${formatted_price} ${formatted_label}`.trim();
};

