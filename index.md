---
layout: default
title: "Diego's Blog"
description: "Resources for cutting‑edge insights on the evolution of Large Language Models, AI tooling, image processing and schema‑first design."
---

# Welcome to my Blog

{% for post in site.posts %}
* [{{ post.title }}]({{ post.url }}) - {{ post.date | date: "%B %d, %Y" }}
{% endfor %}
