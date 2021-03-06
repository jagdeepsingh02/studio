import { EezArrayObject, getProperty } from "eez-studio-shared/model/object";
import { Project } from "project-editor/project/project";

import { ExtensionDefinition } from "project-editor/project/features/extension-definitions/extension-definitions";

////////////////////////////////////////////////////////////////////////////////

export function metrics(project: Project): { [key: string]: string | number } {
    let extensionDefinitions = getProperty(project, "extensionDefinitions") as EezArrayObject<
        ExtensionDefinition
    >;

    return {
        "Extension definitions": extensionDefinitions._array.length
    };
}
