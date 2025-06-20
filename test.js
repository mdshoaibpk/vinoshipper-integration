const phone = '+1234567890';
const cleanedPhone = phone.replace(/^\+1|^1|\D/g, '');
console.log(cleanedPhone);