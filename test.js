const product = {
    tags: ['asdfasdf', 'vinoshipper-sku:1234567891']
}
const tag = product.tags.find(tag => tag.startsWith('vinoshipper-sku:'));
const productId = tag ? tag.split(':')[1] : null;
console.log(productId);