
**NARENGI API CHANGELOG**
=========================

-----

[TOC]

---

#### **Thu Dec 1 2016**

- remove paging filter on listing house features service: ```/api/house-features [GET]```
- ​

#### **Wed Nov 30 2016**

- handle ```token``` request header key for authorization middleware
- ```confirmedUser``` role added for validating ```firstName``` and ```lastName``` that are set in current user profile or not
- validating ```firstName``` and ```lastName``` values for updating user profiles. if they are set then value length should not empty. so users can not set empty value for these fields.
- fix ```/api/houses [GET]``` permissions
- fix ```/api/house-features [GET]``` permissions
- add group field to house features
- add group field to house features
- update house-feature items in main database

---

