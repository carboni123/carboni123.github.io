---
layout: post
title: "Building AgTech from the Ground Up: A Chapter Closed"
date: 2025-04-18
---

This time I will write the blog post myself, without AI assistance ~~formatting only xD~~.  

---

# A New Chapter

I want to tell a part of my life's story, the last 5 years.  
In the beggining of 2020, I was in my final year at the Electrical Engineering course at UFRGS. I had already started my graduation project, but was very unsure of my future. Then the pandemic hit.  
It was a very interesting time. I could no longer proceed with my project, since it required lab equipment and possible electronic components, since it involved creating a PCB.  
I endend up switching projects to something that would not require instruments or components, software. So I started learning Python.

Fast forward a year later. I'd finish my graduation project. The topic was `weed detection with YOLO and other object detection models`, it was quite lucky (or whatever you may call) how I got to do this project.  
I managed to do this project by cold‑emailing a professor that I'd never met in my university. I was interested in doing a project related to the agriculture sector. I had worked a temporary job at my cousin's lab and noticed potential for AI usage. I figured that if I couldn't get a job elsewhere, I could ask for my cousin. **Here is the cold email for reference.**

```text
Saudações.
Prof. Valner Brusamello,

Muito prazer, sou estudante de graduação em Engenharia Elétrica na UFRGS e planejo realizar o projeto de diplomação neste semestre.

Vi no catálogo SABI que o senhor orientou um projeto de mestrado:   "Redes neurais convolutivas aplicadas à detecção de ervas daninhas ; Matheus Cassali da Rosa".
Pretendo fazer um projeto similar, utilizando redes neurais convolutivas e as bibliotecas/APIs Tensorflow/PyTorch. Encontrei alguns datasets como o "ibean", onde eu poderia implementar um modelo de rede convolucional para classificação de doenças nas plantas.
A motivação por esta temática seria o uso da metodologia de treinamento para a análise de amostras de vegetais em um laboratório de análises fitossanitário, possivelmente evitando que o cliente tenha que enviar a amostra ao laboratório (demorando dias para transporte) e também economizando o tempo de trabalho de especialistas. Uma curiosidade: a análise "expressa"(1 a 2 dias) de uma amostra de soja chega a custar  R$ 2000 enquanto uma análise "normal" custa R$400 (dependendo da demanda do laboratório).

O senhor poderia ser o professor orientador do meu projeto?

O detalhes do projeto em questão ficariam ao seu critério como professor orientador. Estou disposto a fazer qualquer projeto relacionado a machine learning.

Enfim, aguardo resposta.

Atenciosamente,
Diego Falkowski Carboni
Email Principal: carboni123@hotmail.com
```

To which he responded that he was already in contact with a company, **Savefarm / Eirene Solutions**, and was in need of help. Both of us could not believe how we found each other, it was something quite special.  
That's the story of how I landed a job at **Savefarm** starting 2022.

---

# At Savefarm

## Year one

Savefarm is a company that produces RGB‑camera‑based sensors for self‑proppeled sprayer vehicles. I joined the company in a startup phase; they barely had 3 customers with 6 systems sold (if I recall correctly).  
I had a very positive outlook for the company, which probably exceeded my manager's at the time, so I was very happy with the job.  
At the time, the system did not undergo any sort of validation testing, all the testing was done in production at the customer's vehicle. I wasn't aware of the capabilities of the system, since it did not have any performance metrics and I was still onboarding the company.

That's when they hired an intern for a validation job. **Oh, boy!**  
As soon as we set‑up a validation system — *old gym treadmill with a green piece of paper stuck to it* — we found out that it didn't perform good at all.  
There were 3 hardware types (the company had to source alternatives for the CPU due to supply‑chain issues — not their fault at all) with different specs: **CM3, Raspberry Pi 3 and Raspberry Pi 4**.  
Since the testing was only done in production before, and all the systems were using the CM3 module, the lab results for the Raspberry Pi 4 were horrendous.

| CPU  | Accuracy <15 km/h | Accuracy >15 km/h |
|------|------------------|-------------------|
| CM3  | 50 – 60 %        | 30 – 40 %         |
| Pi 3 | 50 – 60 %        | 30 – 40 %         |
| Pi 4 | 30 – 40 %        | 20 – 30 %         |

The product did **not** work at all!  
At the time, I was working on a new calibration software and sheet, but it was clear this issue was a top priority. My managers were not very impressed though; their behavior was always like *"if it works, it works"*, although they certainly asked us to not mention it to the CEO.  
Then I had the idea to fix it. At the time I was already interacting with the sensor's codes and understood what needed to be done. So I implemented a multiple approach solution on my own: I reduced the FOV of the camera and added proper threading management to the script. **It was fixed!**  
The results were a system that would reach at least **90 % accuracy** in the required speed ranges (self‑proppeled sprayers operate between 15‑23 km/h typically).

![Calibration Sheet](/assets/images/lona_original.jpeg "Original Calibration Sheet Design")

## Year two

I don't recall doing anything very interesting for this year; I was mostly re‑formatting and fixing many bugs in the project. Most of the project's scripts were rewritten by me and significantly improved, but were not released due to the managers.  
I always assumed they're content with their positions and would not try to push the boundaries to develop a better product. Their behavior was very responsive: the CEO requested something, they'd rush to do it, otherwise nothing would happen.  
At the end of the year, I was invited to participate on a project to use our sensor system to water eucalyptus plants. My manager was trying to do it silently, on his own, but could not make it work. **Here is where I walk in, ~~like a retard~~ trying to do something that can actually improve other peoples lives (which is cool).**  
I solved the issue; by November I'd developed a version that was delivering **>99 % accuracy** on eucalyptus plants, with my own algorithms for eucalyptus segmentation and valve activation.  
Anyways, after that, they literally ignored me; I guess secrecy was to patent a device that they did not make — it felt very counter‑productive.

## Year three

That's the year where I made some significant improvements to the product. Everything was already setup from my second year but was left unreleased. I implemented IaC for the sensor, many new segmentation algorithms and even upgraded some test practices. I'd done so much this year that I actually made a **LinkedIn post** so I could set it as a benchmark for myself.

[🔗 Read the original LinkedIn post](https://www.linkedin.com/posts/diego-falkowski-carboni-7023a4136_estou-finalizando-meu-3%C2%BA-ano-na-savefarm-activity-7275656493402648579-9xjL/?utm_source=share&utm_medium=member_desktop&rcm=ACoAACEpTPIBx-cwkRCiIzYjvTSRgpAqWNYoTJg)

Below is that section translated into English:

> - **Savefarm Spraying:** six update packages containing three new detection algorithms were delivered this year alone to meet our customers’ feature requests.  
> - **Savefarm Irrigation:** a project started in mid‑2023 delivered its first production version. The end result was the sale of **30 + units** to our client/partner Eldorado Brasil Celulose S.A.  
> - **IaC adoption:** we rolled out Infrastructure‑as‑Code to manage the OS for all products in production, simplifying version control and debugging.  
> - **Two new internal R&D products:** including a prototype that uses two cameras simultaneously in our sensors.  
> - **Maintenance of three other products:** such as the **Savefarm Calibrator**, in use across dealerships in Brazil and Argentina.  
> - **Dozens of Python tests + a HIL server:** we implemented extensive automated tests and built a Hardware‑in‑the‑Loop testing server.

This are just the most important things, I've done much more than that, actually (while keeping up with new AI practices).

---

# A conclusion

At the beginning of 2024, I decided to quit. I simply felt that AI was going to take over and I had to stay ahead of the competition in something that is much bigger than the internet. A huge opportunity!  
Meanwhile, Savefarm had been dealing with CNH Industrial from 2023. At the time **CNH Brazil’s branch** was trying to find a viable supplier of spot‑spraying technology to equip their product. The players were: **Bosch’s One Spray** and **Savefarm**.  
The talks increased by mid‑2024 and now they finally closed a deal: **CNH × Savefarm**. At this point I already quit the company and moved to other projects, but it definitely feels nice to have my software work validated.  

Of course this deal wasn't made by myself; both the sales and marketing teams as well as the agronomic engineers worked constantly to actually make the software work — since most of the input configurations are done manually.  
With this, I finally put an end to this phase of my life and move on to the next. I did not own company stock or whatever, so this deal would not affect me in the slightest if I had stayed on the company until now other than the credibility, which I now have.

I congratulate all of the **Savefarm** team for this incredible achievement — beating a global corporation such as Bosch is not an easy task.  
Check out Savefarm at **Case IH**:

[🔗 Savefarm on Case IH’s website](https://www.caseih.com/pt-br/brasil/produtos/tecnologia-de-precisao/savefarm)

![Snapshot of CNH's Website](/assets/images/CNH_Savefarm.jpg "Snapshot of CNH's Website")

---

I move on to new and better things.