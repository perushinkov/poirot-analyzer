/**
 * A class responsible for generating --help infos for the different types of conditions
 */
import {ConditionsRegistry} from '../conditions.registry';
import {ConditionDef, ConditionTypes, MonoCompositeDef, MultiCompositeDef, MultiDef, SingleDef} from '../condition.defs';

// TODO: Test
export class ConditionsHelpInfoUtils {

  private createGroupDescription (headerMsg, dataMatrix) {
    let msg = '<table style="border-style: ridge; display:inline-block;">';
    msg += '<tr><td colspan="3" style="padding:3px;">' + headerMsg + '<br/></td></tr>';
    for (let i = 0; i < dataMatrix.length; i++) {
      msg += '<tr>';
      msg += '<td style="padding:3px;">' + dataMatrix[i][0] + '</td>';
      msg += '<td>' + dataMatrix[i][1] + '</td>';
      msg += '<td style="padding:3px;">' + dataMatrix[i][2] + '</td>';
      msg += '</tr>';
    }
    msg += '</table>';
    return msg;
  }

  private singleGenerate (def: SingleDef, noTags) {
    const aliasBold = noTags ? def.property : (' <b>' + def.property + '</b> ');
    switch (def.type) {
      case 'between':
        const firstSign = def.value.included[0] ? ' < ' : ' <= ';
        const secondSign = def.value.included[1] ? ' < ' : ' <= ';
        return def.value.range[0] + firstSign + aliasBold + secondSign + def.value.range[1];
      case 'identity':
        return aliasBold + ' is ' + def.value;
      case 'comparison':
        return aliasBold + ' ' + def.value.operator + ' ' + def.value.value;
    }
  }

  private multiCompositeGenerate (registry: ConditionsRegistry, def: MultiCompositeDef) {
    const operator = def.type.toUpperCase();
    return '{' + def.values.map((id) => registry.fetch(id).name).join('<b> ' + operator + ' </b>') + '}';
  }

  private monoCompositeGenerate (registry: ConditionsRegistry, def: MonoCompositeDef) {
    switch (def.type) {
      case 'not':
        return 'Not (' + registry.fetch(def.value).name + ')';
      case 'bool':
        return def.value ? 'Is true' : 'Is false';
      case 'reference':
        return 'Condition("' + def.value + '")';
    }
  }

  private multiGenerate (def: MultiDef, ifOneLiner: boolean) {
    const alias = ' <b>' + def.property + '</b> ';
    switch (def.type) {
      case 'ranges':
        const dataPoints = ['-∞'].concat(def.values).concat(['+∞']);
        const dataMatrix = [];

        if (ifOneLiner) {
          return ' <b>' + alias + '</b> in: ( ' + dataPoints.join(' ⟺ ') + ' )';
        } else {
          for (let dataPtIndex = 0; dataPtIndex < dataPoints.length - 1; dataPtIndex++) {
            dataMatrix.push([dataPoints[dataPtIndex], '⟺', dataPoints[dataPtIndex + 1]]);
          }
          return this.createGroupDescription(
            'Property <b>' + alias + '</b> for ranges:',
            dataMatrix
          );
        }
      case 'enums':
        if (ifOneLiner) {
          const oneLiner = def.values.map((value) => value.join(', ')).join(' | ');
          return ' <b>' + alias + '</b> in: ( ' + oneLiner + ' )';
        }
        return this.createGroupDescription(
          'Property <b>' + alias + '</b> for each set:',
          def.values.map(function (defValue, index) {
            return [index + 1, '⇒', defValue.join(', ')];
          })
        );
      case 'values':
        if (ifOneLiner) {
          return ' <b>' + alias + '</b> in: ( ' + def.values.join(' | ') + ' )';
        } else {
          return this.createGroupDescription(
            'Property <b>' + alias + '</b> for each value:',
            def.values.map(function (defValue, index) {
              return [index + 1, '⇒', defValue];
            })
          );
        }
    }
  }

  generate (registry: ConditionsRegistry, def: ConditionDef, ifOneLiner?: boolean) {
    if (def.type in ConditionTypes.multi) {
      return this.multiGenerate(def as MultiDef, ifOneLiner);
    } else if (def.type in ConditionTypes.single) {
      return this.singleGenerate(def as SingleDef, false);
    } else if (def.type === 'and' || def.type === 'or') {
      return this.multiCompositeGenerate(registry, def);
    }
  }


  generateText(registry: ConditionsRegistry, id: string, lastDepth?: number): string {
    if (!id) {
      return '<WIP>';
    }

    const MAX_TEXTGEN_DEPTH = 20;
    const currentDepth = lastDepth ? lastDepth + 1 : 1;
    if (currentDepth > MAX_TEXTGEN_DEPTH) {
      // Depth is used for indentation purposes and infinite recursion catching
      return 'ERROR: Max depth reached during textgen';
    }

    const def = registry.fetch(id);
    if (!!id && !def) {
      return 'ERROR: Valid-looking id, but def is not registered!';
    }
    const indent = '\n' + ''.padEnd(currentDepth * 2, ' ');
    const defTypeHeader = def.type.toUpperCase() + ':';
    switch (def.type) {
      case 'and':
      case 'or':
        const lines = def.values.map((value) => indent + this.generateText(registry, value, currentDepth)).join('');
        return defTypeHeader + lines;
      case 'not':
        return 'NOT' + indent + this.generateText(registry, def.value, currentDepth);
      case 'bool':
        return def.value ? 'TRUE' : 'FALSE';
      case 'between':
      case 'identity':
      case 'comparison':
        return this.singleGenerate(def, true);
    }
  }
}
