import SortableList from '../2-sortable-list/index.js';
import escapeHtml from './utils/escape-html.js';
import fetchJson from './utils/fetch-json.js';
import ImageUploader from "../../08-forms-fetch-api-part-2/1-product-form-v1/utils/image-uploader.js";

const IMGUR_CLIENT_ID = '28aaa2e823b03b1';
const BACKEND_URL = 'https://course-js.javascript.ru';

export default class ProductForm {
  constructor (productId = null) {
    this.productId = productId;
    this.data = {
      categories: [{}],
      products: [{
        description: '',
        title: '',
        discount: '',
        price: '',
        quantity: '',
        status: 1,
        images: [],
      }],
    };
  }

  async render () {
    const element = document.createElement('div');

    this.data = await this.getServerData();

    element.innerHTML = this.template;
    this.element = element.firstElementChild;
    this.subElements = this.getSubElements();

    this.updateSortableList();
    this.initEventListeners();

    return element;
  }

  updateSortableList() {
    let wrapper = document.createElement('div');
    wrapper.innerHTML = this.getImages(this.data.products[0].images);

    const sortableList = new SortableList({
      items: Array.from(wrapper.children)
    });

    this.subElements.imageListContainer.append(sortableList.element);
  }

  get template() {
    const product = this.getProducts();

    return `
      <div class="product-form">
        <form data-element="productForm" class="form-grid" action="" method = "post">
          <div class="form-group form-group__half_left">
            <fieldset>
              <label class="form-label">Название товара</label>
              <input id = "title" required="" type="text" name="title" value="${product.title}" class="form-control" placeholder="Название товара">
            </fieldset>
          </div>
          <div class="form-group form-group__wide">
            <label class="form-label">Описание товара</label>
            <textarea id = "description" required="" class="form-control" name="description" data-element="productDescription" placeholder="Описание товара">${product.description}</textarea>
          </div>
          <div class="form-group form-group__wide" data-element="sortable-list-container">
            <label class="form-label">Фото</label>

            <div data-element="imageListContainer">

            </div>

            <button type="button" name="uploadImage" class="button-primary-outline"><span>Загрузить</span></button>
          </div>
          <div class="form-group form-group__half_left">
            <label class="form-label">Категория</label>
             <select id = "subcategory" class="form-control" name="subcategory">
                ${this.getCategories(this.data)}
             </select>
          </div>

          <div class="form-group form-group__half_left form-group__two-col">
            <fieldset>
              <label class="form-label">Цена ($)</label>
              <input id = "price" required="" type="number" name="price" value="${product.price}" class="form-control" placeholder="100">
            </fieldset>
            <fieldset>
              <label class="form-label">Скидка ($)</label>
              <input id = "discount" required="" type="number" name="discount" value="${product.discount}" class="form-control" placeholder="0">
            </fieldset>
          </div>
          <div class="form-group form-group__part-half">
            <label class="form-label">Количество</label>
            <input id = "quantity" required="" type="number" class="form-control" name="quantity" value="${product.quantity}" placeholder="1">
          </div>
          <div class="form-group form-group__part-half">
            <label class="form-label">Статус</label>
            <select id = "status" class="form-control" name="status">
              ${product.status}
            </select>
          </div>
          <div class="form-buttons">
            <button type="submit" name="save" class="button-primary-outline">
              Сохранить товар
            </button>
          </div>
        </form>
        <input id="uploadImage" type="file" accept="image/*" hidden="">
      </div>
    `;
  }

  getCategories(data) {
    const categories = data.categories;
    return categories.map(category => {
      if (category.subcategories) {
        return category.subcategories.map(subCat => {
          return `<option value="${category.id}">${category.title} &gt; ${subCat.title}</option>`;
        });
      } else {
        return `<option value="${category.id}">${category.title}</option>`;
      }
    }).join('');
  }

  getProducts() {
    const product = this.data.products[0];

    const validText = ['description', 'title'];
    const validNumber = ['discount', 'price', 'quantity', 'status'];

    for (let name in product) {
      switch (true) {
      case validText.includes(name) :
        product[name] = escapeHtml(product[name]);
        break;
      case validNumber.includes(name) :
        product[name] = parseInt(product[name]);
        break;
      }
    }

    const status = () => {
      return `
         <option value="1" ${product.status ? 'selected' : ''}>Активен</option>
         <option value="0" ${product.status ? '' : 'selected'}>Неактивен</option>
      `;
    };
    product.status = status();

    return product;
  }

  getImages(images = []) {
    return images.map((image)=>{
      return `
           <li class="products-edit__imagelist-item sortable-list__item" style="">
            <input type="hidden" name="url" value="${image.url}">
            <input type="hidden" name="source" value="${image.source}">
            <span>
                <img src="icon-grab.svg" data-grab-handle="" alt="grab">
                <img class="sortable-table__cell-img" alt="Image" src="${image.url}">
                <span>${image.source}</span>
            </span>
            <button type="button">
                <img src="icon-trash.svg" data-delete-handle="" alt="delete">
            </button>
           </li>
        `;
    }).join('');
  }

  addNewImage(image) {
    const newImageData = {
      id: image.data.id,
      url: image.data.link,
      source: image.data.deletehash,
    };
    const elImage = document.createElement('div');
    elImage.innerHTML = this.getImages([newImageData]);

    const imageList = this.subElements.imageListContainer.firstElementChild;
    imageList.append(elImage.firstElementChild);
  }

  async getServerData() {
    const categoriesPromise = this.getCategoriesData();
    const productsPromise = this.productId ? this.getProductsData() : this.data.products;

    const [categories, products] = await Promise.all([categoriesPromise, productsPromise]);

    return {categories, products};
  }

  async getCategoriesData() {
    const url = '/api/rest/categories';
    const requestURL = new URL(url, BACKEND_URL);

    requestURL.searchParams.set('_sort', 'weight');
    requestURL.searchParams.set('_refs', 'subcategory');

    return await fetchJson(requestURL);
  }

  async getProductsData() {
    const url = '/api/rest/products';
    const requestURL = new URL(url, BACKEND_URL);

    requestURL.searchParams.set('id', this.productId);

    return await fetchJson(requestURL);
  }

  getSubElements() {
    const result = {};
    const elements = this.element.querySelectorAll('[data-element]');
    for (const subElements of elements) {
      const name = subElements.dataset.element;
      result[name] = subElements;
    }

    const btnUploadImage = this.element.querySelector('[name="uploadImage"]');
    const uploadImage = this.element.querySelector('#uploadImage');
    result['btnUploadImage'] = btnUploadImage;
    result['uploadImage'] = uploadImage;

    return result;
  }

  formatFormData(rowFormData) {
    const formData = new FormData(rowFormData);
    const data = {};
    const images = [];
    const imageSource = formData.getAll('source');
    const imageURL = formData.getAll('url');

    imageSource.forEach((val, index, arr)=>{
      images.push({
        'source': arr[index],
        'url': imageURL[index],
      });
    });

    const validText = ['description', 'title'];
    const validNumber = ['discount', 'price', 'quantity', 'status'];

    for (let [name, value] of formData) {
      switch (true) {
      case validText.includes(name) :
        data[name] = escapeHtml(value);
        break;
      case validNumber.includes(name) :
        data[name] = parseInt(value);
        break;
      }
    }

    data.id = this.productId ? this.productId : null;
    data.images = images;

    return data;
  }

  save = async (e) => {
    e.preventDefault();

    const url = '/api/rest/products';
    const requestURL = new URL(url, BACKEND_URL);
    const data = this.formatFormData(this.subElements.productForm);

    let response = await fetch(requestURL, {
      method: this.productId ? 'PATCH' : 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    this.dispatchEvents(result.id);
  }

  triggerImageUploading = () => {
    this.subElements.uploadImage.click();
  }

  imageUploading = async (e) => {
    const uploader = new ImageUploader();

    try {
      const [file] = e.target.files;
      const result = await uploader.upload(file);
      this.addNewImage(result);
    } catch (error) {
      alert('Ошибка загрузки изображения');
      console.error(error);
    }
  }

  initEventListeners() {
    this.subElements.btnUploadImage.addEventListener('pointerdown', this.triggerImageUploading);
    this.subElements.uploadImage.addEventListener('change', this.imageUploading);
    this.subElements.productForm.addEventListener('submit', this.save);
  }

  dispatchEvents(id) {
    const event = this.productId
      ? new CustomEvent('product-updated', {detail: id})
      : new CustomEvent('product-saved');

    this.element.dispatchEvent(event);
  }

  remove () {
    if (this.element) {
      this.element.remove();
    }
  }

  destroy () {
    this.remove();
  }
}
