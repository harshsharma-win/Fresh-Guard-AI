import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

type Tree = { nodes: number[][] }
type TrainedModel = {
  schema_version: number
  trained_at: string
  dataset: {
    rows: number
    unique_rows: number
    duplicate_rows_removed: number
    shelf_life_label_source: string
  }
  products: string[]
  feature_names: string[]
  numeric_feature_ranges: Record<string, [number, number]>
  numeric_feature_defaults: Record<string, number>
  product_max_shelf_life_days: Record<string, number>
  quality_metrics: { accuracy: number; balanced_accuracy: number; f1_bad: number }
  shelf_life_metrics: { mae_days: number; rmse_days: number; r2: number }
  validation: { method: string; test_rows: number; warning: string }
  model: { quality_trees: Tree[]; shelf_life_trees: Tree[] }
}

type PredictionInput = {
  vegetable: string
  temperature: number
  humidity: number
  gasVocCo2Ppm: number
  lightLux: number
  storageDays: number
  maxShelfLifeDays: number
  allowExtrapolation: boolean
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let modelPromise: Promise<TrainedModel> | null = null

async function loadModel() {
  if (!modelPromise) {
    const modelPath = path.join(process.cwd(), 'app', 'api', 'predict', 'model.json')
    modelPromise = readFile(modelPath, 'utf8')
      .then((contents) => JSON.parse(contents) as TrainedModel)
      .catch((error: unknown) => {
        modelPromise = null
        throw error
      })
  }
  return modelPromise
}

function evaluateTree(tree: Tree, features: number[]) {
  let index = 0
  while (tree.nodes[index] && tree.nodes[index][0] >= 0) {
    const [feature, threshold, left, right] = tree.nodes[index]
    index = features[feature] <= threshold ? left : right
  }
  return tree.nodes[index]
}

function predictClassification(trees: Tree[], features: number[]) {
  const probabilities = trees.reduce(
    (sum, tree) => {
      const leaf = evaluateTree(tree, features)
      sum[0] += leaf[4]
      sum[1] += leaf[5]
      return sum
    },
    [0, 0],
  )
  return probabilities.map((value) => value / trees.length)
}

function predictShelfLife(trees: Tree[], features: number[]) {
  return trees.reduce((sum, tree) => sum + evaluateTree(tree, features)[4], 0) / trees.length
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function readInput(payload: Record<string, unknown>): PredictionInput | null {
  const fields = [
    'temperature',
    'humidity',
    'gasVocCo2Ppm',
    'lightLux',
    'storageDays',
    'maxShelfLifeDays',
  ] as const
  if (
    typeof payload.vegetable !== 'string' ||
    (payload.allowExtrapolation !== undefined && typeof payload.allowExtrapolation !== 'boolean') ||
    fields.some((field) => typeof payload[field] !== 'number' || !Number.isFinite(payload[field]))
  ) {
    return null
  }
  return {
    vegetable: payload.vegetable.trim(),
    temperature: payload.temperature as number,
    humidity: payload.humidity as number,
    gasVocCo2Ppm: payload.gasVocCo2Ppm as number,
    lightLux: payload.lightLux as number,
    storageDays: payload.storageDays as number,
    maxShelfLifeDays: payload.maxShelfLifeDays as number,
    allowExtrapolation: payload.allowExtrapolation === true,
  }
}

export async function GET() {
  try {
    const model = await loadModel()
    return NextResponse.json(
      {
        products: model.products,
        productMaxShelfLifeDays: model.product_max_shelf_life_days,
        trainedAt: model.trained_at,
        dataset: model.dataset,
        featureRanges: model.numeric_feature_ranges,
        featureDefaults: model.numeric_feature_defaults,
        qualityMetrics: model.quality_metrics,
        shelfLifeMetrics: model.shelf_life_metrics,
        validation: model.validation,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('Could not load FreshGuard prediction model:', error)
    return NextResponse.json({ error: 'Prediction model is unavailable on this server.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }
  if (!isRecord(payload)) {
    return NextResponse.json({ error: 'Provide a prediction input object.' }, { status: 400 })
  }

  const input = readInput(payload)
  if (!input) {
    return NextResponse.json({ error: 'Provide valid finite values for every model input.' }, { status: 400 })
  }

  try {
    const model = await loadModel()
    if (!model.products.includes(input.vegetable)) {
      return NextResponse.json(
        { error: `This prototype supports: ${model.products.join(', ')}.` },
        { status: 400 },
      )
    }
    const values: Record<string, number> = {
      Temperature: input.temperature,
      Humidity: input.humidity,
      Gas_VOC_CO2ppm: input.gasVocCo2Ppm,
      Light_Lux: input.lightLux,
      Storage_Time_Days: input.storageDays,
      Max_Shelf_Life_Days: input.maxShelfLifeDays,
    }
    const outOfRange = Object.entries(values).flatMap(([key, value]) => {
      const [minimum, maximum] = model.numeric_feature_ranges[key]
      return value < minimum || value > maximum
        ? [{ feature: key, value, minimum, maximum }]
        : []
    })
    if (outOfRange.length && !input.allowExtrapolation) {
      return NextResponse.json(
        {
          error: 'Input is outside this dataset’s training range; the prototype will not extrapolate.',
          outOfRange,
          warning: model.validation.warning,
        },
        { status: 422 },
      )
    }

    const features = [
      ...model.products.map((product) => Number(product === input.vegetable)),
      input.temperature,
      input.humidity,
      input.gasVocCo2Ppm,
      input.lightLux,
      input.storageDays,
      input.maxShelfLifeDays,
    ]
    const [badProbability, goodProbability] = predictClassification(model.model.quality_trees, features)
    const remainingDays = Math.max(
      0,
      Math.min(
        input.maxShelfLifeDays,
        predictShelfLife(model.model.shelf_life_trees, features),
      ),
    )
    return NextResponse.json(
      {
        vegetable: input.vegetable,
        quality: badProbability >= goodProbability ? 'Bad' : 'Good',
        spoilageProbability: badProbability,
        remainingShelfLifeDays: remainingDays,
        validationMaeDays: model.shelf_life_metrics.mae_days,
        withinTwoDayWindow: remainingDays <= 2,
        extrapolated: outOfRange.length > 0,
        outOfRange: outOfRange.length ? outOfRange : undefined,
        modelWarning: model.validation.warning,
        note: outOfRange.length
          ? 'Experimental extrapolation outside training data; highly uncertain and never a food-safety decision.'
          : 'Prototype estimates from simulated shelf-life labels; not a food-safety decision.',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('FreshGuard prediction failed:', error)
    return NextResponse.json({ error: 'Could not calculate a prediction.' }, { status: 500 })
  }
}
