import { Router, Request, Response } from 'express';
import type { EmberService } from '../../services/ember/EmberService.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('api:channel');

interface EnumParam {
  path: string;
  value: number;
  min: number;
  max: number;
  enumValues: string[];
}

interface ChannelData {
  path: string;
  name: string;
  fader: { path: string; value: number; min: number; max: number; factor: number };
  mute: { path: string; value: boolean };
  eq: {
    on: { path: string; value: boolean };
    bands: Array<{
      gain: { path: string; value: number; min: number; max: number; factor: number };
      freq: { path: string; value: number; min: number; max: number };
      q: { path: string; value: number; min: number; max: number; factor: number };
      on: { path: string; value: boolean };
      type?: EnumParam;
      slope?: EnumParam;
    }>;
  };
  compressor: {
    on: { path: string; value: boolean };
    threshold: { path: string; value: number; min: number; max: number; factor: number };
    ratio: { path: string; value: number; min: number; max: number };
    attack: { path: string; value: number; min: number; max: number; factor: number };
    release: { path: string; value: number; min: number; max: number; factor: number };
    softKnee?: EnumParam;
  };
  pan: {
    on: { path: string; value: boolean };
    slope: { path: string; value: number; min: number; max: number };
  };
  inputGain: {
    gain: { path: string; value: number; min: number; max: number; factor: number };
    phase: { path: string; value: boolean };
  };
  metering: {
    main: { path: string; value: number; min: number; max: number; factor: number };
    input: { path: string; value: number; min: number; max: number; factor: number };
    insert: { path: string; value: number; min: number; max: number; factor: number };
    directOut: { path: string; value: number; min: number; max: number; factor: number };
  };
}

export function createChannelRouter(emberService: EmberService): Router {
  const router = Router();

  // Debug: Dump all parameters of a channel with full details
  router.get('/debug/:path(*)', async (req: Request, res: Response) => {
    try {
      const channelPath = req.params.path;
      logger.info(`DEBUG: Analyzing channel structure for: ${channelPath}`);

      await emberService.expandPath(channelPath);
      
      interface ParamInfo {
        path: string;
        description: string;
        type: string;
        parameterType?: string;
        value?: unknown;
        minimum?: number;
        maximum?: number;
        factor?: number;
        enumeration?: string[];
        enumMap?: Record<number, string>;
        access?: string;
        formula?: string;
      }

      const allParams: ParamInfo[] = [];

      async function exploreNode(nodePath: string, depth = 0): Promise<void> {
        if (depth > 6) return; // Limit depth
        
        try {
          const children = await emberService.expandNode(nodePath);
          
          for (const child of children) {
            const childPath = `${nodePath}.${child.number}`;
            const contents = child.contents as any || {};
            
            if (contents.type === 'PARAMETER') {
              const param: ParamInfo = {
                path: childPath,
                description: contents.description || 'Unknown',
                type: contents.type,
                parameterType: contents.parameterType,
                value: contents.value,
                minimum: contents.minimum,
                maximum: contents.maximum,
                factor: contents.factor,
                access: contents.access,
              };
              
              // Check for enumeration
              if (contents.enumeration) {
                param.enumeration = contents.enumeration;
              }
              if (contents.enumMap) {
                param.enumMap = contents.enumMap;
              }
              // Check for formula/format
              if (contents.formula) {
                param.formula = contents.formula;
              }
              
              allParams.push(param);
              logger.debug(`PARAM: ${contents.description} | type=${contents.parameterType} | value=${contents.value} | min=${contents.minimum} | max=${contents.maximum} | factor=${contents.factor}`);
            } else if (contents.type === 'NODE') {
              logger.debug(`NODE: ${contents.description} at ${childPath}`);
              await exploreNode(childPath, depth + 1);
            }
          }
        } catch (err) {
          logger.debug(`Could not explore ${nodePath}: ${err}`);
        }
      }

      await exploreNode(channelPath);

      // Group by section
      const grouped: Record<string, ParamInfo[]> = {};
      for (const param of allParams) {
        const parts = param.description.split(' ');
        const section = parts[0] || 'Other';
        if (!grouped[section]) grouped[section] = [];
        grouped[section].push(param);
      }

      res.json({
        success: true,
        data: {
          channelPath,
          totalParams: allParams.length,
          grouped,
          allParams
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('DEBUG failed:', error);
      res.status(500).json({
        success: false,
        error: { code: 'DEBUG_ERROR', message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // List available channels (Inputs)
  router.get('/', async (_req: Request, res: Response) => {
    try {
      logger.info('Listing available channels');
      
      // Get tree root and find Channels > Inputs section
      const tree = await emberService.getTree();
      const channelsNode = tree.find(n => n.contents?.description === 'Channels');
      if (!channelsNode) {
        return res.json({ success: true, data: [], timestamp: new Date().toISOString() });
      }

      const channelsPath = String(channelsNode.number);
      const channelsChildren = await emberService.expandNode(channelsPath);
      const inputsNode = channelsChildren.find(n => n.contents?.description === 'Inputs');
      if (!inputsNode) {
        return res.json({ success: true, data: [], timestamp: new Date().toISOString() });
      }

      const inputsPath = `${channelsPath}.${inputsNode.number}`;
      const channels = await emberService.expandNode(inputsPath);

      const channelList = channels.map(ch => ({
        path: `${inputsPath}.${ch.number}`,
        name: ch.contents?.description || `Channel ${ch.number}`,
        number: ch.number
      }));

      logger.info(`Found ${channelList.length} input channels`);
      res.json({
        success: true,
        data: channelList,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to list channels:', error);
      res.status(500).json({
        success: false,
        error: { code: 'CHANNEL_LIST_ERROR', message },
        timestamp: new Date().toISOString()
      });
    }
  });

  async function getParameterValue(path: string): Promise<{ value: any; min?: number; max?: number; factor?: number }> {
    try {
      const element = await emberService.getElementByPath(path);
      const contents = element.contents || {};
      return {
        value: contents.value,
        min: contents.minimum,
        max: contents.maximum,
        factor: contents.factor || 1
      };
    } catch {
      return { value: null };
    }
  }

  async function findChildByDescription(parentPath: string, description: string): Promise<string | null> {
    try {
      const children = await emberService.expandNode(parentPath);
      const child = children.find(c => 
        c.contents?.description?.toLowerCase().includes(description.toLowerCase())
      );
      return child ? `${parentPath}.${child.number}` : null;
    } catch {
      return null;
    }
  }

  router.get('/:path(*)', async (req: Request, res: Response) => {
    try {
      const channelPath = req.params.path;
      logger.info(`Loading channel data for: ${channelPath}`);

      // Expand path first to ensure it's loaded
      await emberService.expandPath(channelPath);

      // Get channel info
      const channelElement = await emberService.getElementByPath(channelPath);
      const channelName = channelElement.contents?.description || 'Unknown';

      // Expand channel to get children
      const channelChildren = await emberService.expandNode(channelPath);
      
      // Find Fader section
      const faderNode = channelChildren.find(c => c.contents?.description === 'Fader');
      let faderData = { path: '', value: -4096, min: -4096, max: 480, factor: 32 };
      if (faderNode) {
        const faderPath = `${channelPath}.${faderNode.number}`;
        const faderChildren = await emberService.expandNode(faderPath);
        const faderLevel = faderChildren.find(c => c.contents?.description === 'Fader Level');
        if (faderLevel) {
          const p = `${faderPath}.${faderLevel.number}`;
          const data = await getParameterValue(p);
          faderData = { 
            path: p, 
            value: data.value ?? -4096, 
            min: data.min ?? -4096, 
            max: data.max ?? 480, 
            factor: data.factor ?? 32 
          };
        }
      }

      // Find Mute section
      const muteNode = channelChildren.find(c => c.contents?.description === 'Mute');
      let muteData = { path: '', value: false };
      if (muteNode) {
        const mutePath = `${channelPath}.${muteNode.number}`;
        const muteChildren = await emberService.expandNode(mutePath);
        const muteParam = muteChildren.find(c => c.contents?.description === 'Mute');
        if (muteParam) {
          const p = `${mutePath}.${muteParam.number}`;
          const data = await getParameterValue(p);
          muteData = { path: p, value: data.value ?? false };
        }
      }

      // Find Signal Processing > Equalizer
      const sigProcNode = channelChildren.find(c => c.contents?.description === 'Signal Processing');
      let eqData: ChannelData['eq'] = { on: { path: '', value: false }, bands: [] };
      let compData: ChannelData['compressor'] = {
        on: { path: '', value: false },
        threshold: { path: '', value: -1056, min: -2240, max: 640, factor: 32 },
        ratio: { path: '', value: 779, min: 0, max: 2048 },
        attack: { path: '', value: 5, min: 5, max: 12000, factor: 48 },
        release: { path: '', value: 4800, min: 1920, max: 480000, factor: 48 }
      };

      if (sigProcNode) {
        const sigProcPath = `${channelPath}.${sigProcNode.number}`;
        const sigProcChildren = await emberService.expandNode(sigProcPath);

        // Find Equalizer
        const eqNode = sigProcChildren.find(c => c.contents?.description === 'Equalizer');
        if (eqNode) {
          const eqPath = `${sigProcPath}.${eqNode.number}`;
          const eqChildren = await emberService.expandNode(eqPath);
          
          // Get EQ On state
          const eqOnParam = eqChildren.find(c => c.contents?.description === 'Equalizer On');
          if (eqOnParam) {
            const p = `${eqPath}.${eqOnParam.number}`;
            const data = await getParameterValue(p);
            eqData.on = { path: p, value: data.value ?? false };
          }

          // Get 4 bands
          for (let i = 1; i <= 4; i++) {
            const gainParam = eqChildren.find(c => c.contents?.description === `Equalizer ${i} Gain`);
            const freqParam = eqChildren.find(c => c.contents?.description === `Equalizer ${i} Frequency`);
            const qParam = eqChildren.find(c => c.contents?.description === `Equalizer ${i} Q`);
            const onParam = eqChildren.find(c => c.contents?.description === `Equalizer ${i} On`);
            const typeParam = eqChildren.find(c => c.contents?.description === `Equalizer ${i} Type`);

            const band: ChannelData['eq']['bands'][0] = {
              gain: { path: '', value: 0, min: -768, max: 768, factor: 32 },
              freq: { path: '', value: 4000, min: 2131, max: 7045 },
              q: { path: '', value: 64, min: 6, max: 5120, factor: 64 },
              on: { path: '', value: true },
              type: undefined
            };

            if (gainParam) {
              const p = `${eqPath}.${gainParam.number}`;
              const data = await getParameterValue(p);
              band.gain = { path: p, value: data.value ?? 0, min: data.min ?? -768, max: data.max ?? 768, factor: data.factor ?? 32 };
            }
            if (freqParam) {
              const p = `${eqPath}.${freqParam.number}`;
              const data = await getParameterValue(p);
              band.freq = { path: p, value: data.value ?? 4000, min: data.min ?? 2131, max: data.max ?? 7045 };
            }
            if (qParam) {
              const p = `${eqPath}.${qParam.number}`;
              const data = await getParameterValue(p);
              band.q = { path: p, value: data.value ?? 64, min: data.min ?? 6, max: data.max ?? 5120, factor: data.factor ?? 64 };
            }
            if (onParam) {
              const p = `${eqPath}.${onParam.number}`;
              const data = await getParameterValue(p);
              band.on = { path: p, value: data.value ?? true };
            }
            if (typeParam) {
              const p = `${eqPath}.${typeParam.number}`;
              const element = await emberService.getElementByPath(p);
              const contents = element.contents as any || {};
              const enumStr = contents.enumeration || '';
              band.type = { 
                path: p, 
                value: typeof contents.value === 'number' ? contents.value : 0,
                min: contents.minimum ?? 0,
                max: contents.maximum ?? 1,
                enumValues: enumStr.split('\n').map((s: string) => s.trim()).filter(Boolean)
              };
            }

            // Get Slope
            const slopeParam = eqChildren.find(c => c.contents?.description === `Equalizer ${i} Slope`);
            if (slopeParam) {
              const p = `${eqPath}.${slopeParam.number}`;
              const element = await emberService.getElementByPath(p);
              const contents = element.contents as any || {};
              const enumStr = contents.enumeration || '';
              band.slope = { 
                path: p, 
                value: typeof contents.value === 'number' ? contents.value : 0,
                min: contents.minimum ?? 0,
                max: contents.maximum ?? 2,
                enumValues: enumStr.split('\n').map((s: string) => s.trim()).filter(Boolean)
              };
            }

            eqData.bands.push(band);
          }
        }

        // Find Compressor
        const compNode = sigProcChildren.find(c => c.contents?.description === 'Compressor');
        if (compNode) {
          const compPath = `${sigProcPath}.${compNode.number}`;
          const compChildren = await emberService.expandNode(compPath);

          const params = [
            { name: 'Compressor On', key: 'on', defaults: { value: false } },
            { name: 'Compressor Threshold', key: 'threshold', defaults: { value: -1056, min: -2240, max: 640, factor: 32 } },
            { name: 'Compressor Ratio', key: 'ratio', defaults: { value: 779, min: 0, max: 2048 } },
            { name: 'Compressor Attack', key: 'attack', defaults: { value: 5, min: 5, max: 12000, factor: 48 } },
            { name: 'Compressor Release', key: 'release', defaults: { value: 4800, min: 1920, max: 480000, factor: 48 } }
          ];

          for (const param of params) {
            const found = compChildren.find(c => c.contents?.description === param.name);
            if (found) {
              const p = `${compPath}.${found.number}`;
              const data = await getParameterValue(p);
              (compData as any)[param.key] = {
                path: p,
                value: data.value ?? param.defaults.value,
                ...((param.defaults as any).min !== undefined && { min: data.min ?? (param.defaults as any).min }),
                ...((param.defaults as any).max !== undefined && { max: data.max ?? (param.defaults as any).max }),
                ...((param.defaults as any).factor !== undefined && { factor: data.factor ?? (param.defaults as any).factor })
              };
            }
          }
        }
      }

      // Find Pan section
      const panNode = channelChildren.find(c => c.contents?.description === 'Pan');
      let panData: ChannelData['pan'] = {
        on: { path: '', value: true },
        slope: { path: '', value: 0, min: -20, max: 20 }
      };
      if (panNode) {
        const panPath = `${channelPath}.${panNode.number}`;
        const panChildren = await emberService.expandNode(panPath);
        
        const panOnParam = panChildren.find(c => c.contents?.description === 'Pan On');
        if (panOnParam) {
          const p = `${panPath}.${panOnParam.number}`;
          const data = await getParameterValue(p);
          panData.on = { path: p, value: data.value ?? true };
        }
        
        const panSlopeParam = panChildren.find(c => c.contents?.description === 'Pan Slope');
        if (panSlopeParam) {
          const p = `${panPath}.${panSlopeParam.number}`;
          const data = await getParameterValue(p);
          panData.slope = { path: p, value: data.value ?? 0, min: data.min ?? -20, max: data.max ?? 20 };
        }
      }

      // Find Input section
      const inputNode = channelChildren.find(c => c.contents?.description === 'Input');
      let inputGainData: ChannelData['inputGain'] = {
        gain: { path: '', value: 0, min: -4096, max: 2560, factor: 32 },
        phase: { path: '', value: false }
      };
      if (inputNode) {
        const inputPath = `${channelPath}.${inputNode.number}`;
        const inputChildren = await emberService.expandNode(inputPath);
        
        const gainParam = inputChildren.find(c => c.contents?.description === 'Input Gain');
        if (gainParam) {
          const p = `${inputPath}.${gainParam.number}`;
          const data = await getParameterValue(p);
          inputGainData.gain = { path: p, value: data.value ?? 0, min: data.min ?? -4096, max: data.max ?? 2560, factor: data.factor ?? 32 };
        }
        
        const phaseParam = inputChildren.find(c => c.contents?.description === 'Input Phase Revert Left');
        if (phaseParam) {
          const p = `${inputPath}.${phaseParam.number}`;
          const data = await getParameterValue(p);
          inputGainData.phase = { path: p, value: data.value ?? false };
        }
      }

      // Find Metering parameters (READ ONLY) - in the "Metering" node
      let meteringData: ChannelData['metering'] = {
        main: { path: '', value: -8192, min: -4096, max: 480, factor: 32 },
        input: { path: '', value: -8192, min: -4096, max: 480, factor: 32 },
        insert: { path: '', value: -8192, min: -4096, max: 480, factor: 32 },
        directOut: { path: '', value: -8192, min: -4096, max: 480, factor: 32 }
      };

      const meteringNode = channelChildren.find(c => c.contents?.description === 'Metering');
      if (meteringNode) {
        const meteringPath = `${channelPath}.${meteringNode.number}`;
        const meteringChildren = await emberService.expandNode(meteringPath);
        
        const meteringParams = [
          { paramName: 'Main Level', key: 'main' },
          { paramName: 'Input Level', key: 'input' },
          { paramName: 'Insert Level', key: 'insert' },
          { paramName: 'Direct Out Level', key: 'directOut' }
        ];

        for (const mp of meteringParams) {
          const levelParam = meteringChildren.find(c => c.contents?.description === mp.paramName);
          if (levelParam) {
            const p = `${meteringPath}.${levelParam.number}`;
            const data = await getParameterValue(p);
            (meteringData as any)[mp.key] = {
              path: p,
              value: data.value ?? -8192,
              min: data.min ?? -4096,
              max: data.max ?? 480,
              factor: data.factor ?? 32
            };
          }
        }
      }

      const channelData: ChannelData = {
        path: channelPath,
        name: channelName,
        fader: faderData,
        mute: muteData,
        eq: eqData,
        compressor: compData,
        pan: panData,
        inputGain: inputGainData,
        metering: meteringData
      };

      logger.info(`Channel ${channelName} loaded successfully`);

      res.json({
        success: true,
        data: channelData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to get channel:', error);
      res.status(500).json({
        success: false,
        error: { code: 'CHANNEL_ERROR', message },
        timestamp: new Date().toISOString()
      });
    }
  });

  // PUT parameter value
  router.put('/parameter/:path(*)', async (req: Request, res: Response) => {
    try {
      const paramPath = req.params.path;
      const { value } = req.body;

      if (value === undefined) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_VALUE', message: 'Value is required' },
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`Setting parameter ${paramPath} to ${value}`);
      await emberService.setValue(paramPath, value);

      res.json({
        success: true,
        data: { path: paramPath, value },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to set parameter:', error);
      res.status(500).json({
        success: false,
        error: { code: 'PARAMETER_ERROR', message },
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}
