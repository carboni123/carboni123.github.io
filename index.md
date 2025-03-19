---
layout: default
title: "My Blog"
---

# Welcome to my Blog

{% for post in site.posts %}
* [{{ post.title }}]({{ post.url }}) - {{ post.date | date: "%B %d, %Y" }}
{% endfor %}
