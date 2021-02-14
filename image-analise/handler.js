'use strict';
const { promises: {readFile}} = require('fs')
const { get } = require('axios')

class Handler{

  constructor({rekoSvc,translatorSvc}){
    this.rekoSvc = rekoSvc
    this.translatorSvc= translatorSvc
  }

  async detectarImg(buffer){
    const result = await this.rekoSvc.detectLabels({
      Image: {
        Bytes: buffer
      }
    }).promise()

    const resultItems = result.Labels
    .filter(({ Confidence }) => Confidence > 80);
    
    const nomes = resultItems
    .map(({ Name }) => Name)
    .join(' and ')

    return { nomes, resultItems }

    //console.log(result)
  }


  async traducaoPt(texto){
    const params = {
      SourceLanguageCode: 'en',
      TargetLanguageCode: 'pt',
      Text: texto
    }
    const { TranslatedText } = await this.translatorSvc
                            .translateText(params)
                            .promise()
    return TranslatedText.split(' e ')

  }

  async formatacaoTextoResultado(texto, resultItems){
    const finalText = []
    for(const indexText in texto) {
      const nameInPortuguese = texto[indexText]
      const confidence = resultItems[indexText].Confidence;
      finalText.push(
        ` ${confidence.toFixed(2)}% de ser do tipo ${nameInPortuguese}`

      )
    }
    return finalText.join('\n')
  }

  async getImagemBuffer(imageUrl){
    const response = await get(imageUrl,{
      responseType:'arraybuffer'
    })

    const buffer = Buffer.from(response.data, "base64")
    return  buffer

  }

  async main(event){
    try {
     // const imgBuffer = await readFile('./img/cat.jpg')
     const { imageUrl }= event.queryStringParameters
      console.log("Dowload")
      const buffer = await this.getImagemBuffer(imageUrl)
      console.log("Detecta os labels")
      const { nomes, resultItems } = await this.detectarImg(buffer)
      console.log("tradutor pt")
      const texto = await this.traducaoPt(nomes)
      console.log("Manipulando objeto")
      const finalTexto = await this.formatacaoTextoResultado(texto,resultItems)
      console.log("finalizando")

      return {statusCode: 200,
        body: `A imagem tem\n`.concat(finalTexto) }
    } catch (error) {
     // console.log('Error**', error.stack)
      return{
        statusCode: 500,
        body: "Intervalo de error no servidor."
      }
    }

  }
}

//factory
const aws = require('aws-sdk')
const reko =  new aws.Rekognition()
const translator = new aws.Translate()
const handler = new Handler({
  rekoSvc: reko,
  translatorSvc: translator
});

module.exports.main = handler.main.bind(handler)