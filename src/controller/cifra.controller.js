import cifraService from "../service/cifra.service.js";

async function createCifraController(req, res) {
  try {
    const cifra = await cifraService.createCifraService(req.body, req.userId);
    return res.status(201).send(cifra);
  } catch (error) {
    return res.status(error?.statusCode || 400).send(error.message);
  }
}

async function updateCifraController(req, res) {
  const id = req.params.id;
  try {
    const cifra = await cifraService.updateCifraService(id, req.body, {
      requesterId: req.userId,
      requesterLevel: req.userLevel,
    });
    return res.status(200).send(cifra);
  } catch (error) {
    return res.status(error?.statusCode || 400).send(error.message);
  }
}

async function deleteCifraController(req, res) {
  const id = req.params.id;
  try {
    await cifraService.deleteCifraService(id, {
      requesterId: req.userId,
      requesterLevel: req.userLevel,
    });
    return res.status(200).send({ message: "Cifra deletada com sucesso" });
  } catch (error) {
    return res.status(error?.statusCode || 400).send(error.message);
  }
}

async function getAllCifraController(req, res) {
  try {
    const { nome, categorias, favoritos, page, limit } = req.query;

    const toArray = (val) =>
      val ? String(val).split(",").map((s) => s.trim()).filter(Boolean) : undefined;

    const result = await cifraService.getAllCifraService({
      nome: nome ? String(nome) : undefined,
      categorias: toArray(categorias),
      favoritos: toArray(favoritos),
      page: page !== undefined ? Number(page) : 0,
      limit: limit !== undefined ? Math.min(Number(limit), 100) : 15,
    });

    return res.status(200).json(result);
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
