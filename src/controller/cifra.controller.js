import cifraService from "../service/cifra.service.js";

async function createCifraController(req, res) {
  try {
    const cifra = await cifraService.createCifraService(req.body);
    return res.status(201).send(cifra);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function updateCifraController(req, res) {
  const id = req.params.id;
  try {
    const cifra = await cifraService.updateCifraService(id, req.body);
    return res.status(200).send(cifra);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function deleteCifraController(req, res) {
  const id = req.params.id;
  try {
    await cifraService.deleteCifraService(id);
    return res.status(200).send({ message: "Cifra deletada com sucesso" });
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function getAllCifraController(req, res) {
  try {
    const cifra = await cifraService.getAllCifraService();
    return res.status(200).send(cifra);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function getCifraByIdController(req, res) {
  try {
    const cifra = await cifraService.getCifraById(req.params.id);
    return res.status(200).send(cifra);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

export default {
  createCifraController,
  getAllCifraController,
  getCifraByIdController,
  updateCifraController,
  deleteCifraController,
};
